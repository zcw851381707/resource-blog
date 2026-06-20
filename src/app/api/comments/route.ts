import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { moderateComment } from '@/lib/moderation'

// GET /api/comments?dramaId=xxx&page=1&limit=10
export async function GET(request: NextRequest) {
  const dramaId = request.nextUrl.searchParams.get('dramaId')
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '10')))
  if (!dramaId) return NextResponse.json({ error: '缺少 dramaId' }, { status: 400 })

  const session = await getSession()

  // 公开显示只展示审核通过的评论（flag=clean）
  // 管理员自己写的评论也可见（包括可疑状态的）
  const whereBase: Record<string, unknown> = { dramaId, isDeleted: false }
  if (session?.role === 'admin') {
    whereBase.OR = [
      { flag: 'clean' },
      { userId: session.userId },
    ]
  } else {
    whereBase.flag = 'clean'
  }

  const [items, total] = await Promise.all([
    prisma.comment.findMany({
      where: whereBase as any,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        content: true,
        createdAt: true,
        userId: true,
        dramaId: true,
      },
    }),
    prisma.comment.count({ where: whereBase as any }),
  ])

  // 并发查用户名 + 剧名
  const userIds = [...new Set(items.map(i => i.userId))]
  const dramaIds = [...new Set(items.map(i => i.dramaId))]
  const [users, dramas] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatar: true, role: true },
    }),
    prisma.drama.findMany({
      where: { id: { in: dramaIds } },
      select: { id: true, title: true, slug: true },
    }),
  ])
  const userMap = Object.fromEntries(users.map(u => [u.id, { username: u.username, avatar: u.avatar, role: u.role }]))
  const dramaMap = Object.fromEntries(dramas.map(d => [d.id, { title: d.title, slug: d.slug }]))

  const enriched = items.map(item => ({
    id: item.id,
    content: item.content,
    createdAt: item.createdAt.toISOString(),
    isMine: session ? item.userId === session.userId : false,
    user: userMap[item.userId] || { username: '已注销', avatar: null, role: 'user' },
    isAdmin: userMap[item.userId]?.role === 'admin',
    dramaTitle: dramaMap[item.dramaId]?.title || '',
    dramaSlug: dramaMap[item.dramaId]?.slug || '',
  }))

  return NextResponse.json({ items: enriched, total, page, totalPages: Math.ceil(total / limit) })
}

// POST /api/comments → { dramaId, content }
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { dramaId, content } = await request.json()
  if (!dramaId || !content || content.trim().length === 0) {
    return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 })
  }
  if (content.length > 500) {
    return NextResponse.json({ error: '评论不能超过 500 字' }, { status: 400 })
  }

  // 检查是否被禁言
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { mutedUntil: true, role: true },
  })
  // 管理员不受禁言限制
  if (user?.role !== 'admin' && user?.mutedUntil && new Date(user.mutedUntil) > new Date()) {
    const until = new Date(user.mutedUntil)
    const days = Math.ceil((until.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    const untilStr = days <= 1
      ? until.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      : `${days} 天后`
    return NextResponse.json({
      ok: true,
      flag: 'toxic',
      isDeleted: true,
      message: `你已被禁言，${untilStr}解除`,
    })
  }

  // 检查禁言词条（数据库级）
  const bannedWords = await prisma.bannedWord.findMany({ select: { word: true } })
  const lowerContent = content.trim().toLowerCase()
  const matchedWord = bannedWords.find(bw => lowerContent.includes(bw.word.toLowerCase()))
  if (matchedWord) {
    // 匹配到禁用词 → 直接软删除
    const comment = await prisma.comment.create({
      data: {
        userId: session.userId,
        dramaId,
        content: content.trim(),
        flag: 'toxic',
        isDeleted: true,
      },
    })
    return NextResponse.json({
      ok: true,
      id: comment.id,
      createdAt: comment.createdAt.toISOString(),
      flag: 'toxic',
      moderated: true,
      message: `评论因含禁用词“${matchedWord.word}”已被系统清除`,
    })
  }

  // 内容审核（关键词）
  const { flag, isDeleted } = moderateComment(content.trim())

  const comment = await prisma.comment.create({
    data: {
      userId: session.userId,
      dramaId,
      content: content.trim(),
      flag,
      isDeleted,
    },
  })

  return NextResponse.json({
    ok: true,
    id: comment.id,
    createdAt: comment.createdAt.toISOString(),
    flag,
    moderated: flag !== 'clean',
    message: flag === 'toxic'
      ? '评论因含违规内容已被系统清除'
      : flag === 'suspicious'
        ? '评论已提交，待管理员审核后展示'
        : undefined,
  })
}
