import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/comments?tab=clean|suspicious|toxic&page=1&limit=20
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '无权访问' }, { status: 403 })
  }

  const tab = request.nextUrl.searchParams.get('tab') || 'clean'
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '20')))

  const where: Record<string, unknown> = {}
  if (tab === 'toxic') {
    where.flag = 'toxic'
    // toxic 已经 isDeleted=true
  } else if (tab === 'suspicious') {
    where.flag = 'suspicious'
    where.isDeleted = false
  } else {
    // clean = 正常
    where.flag = 'clean'
    where.isDeleted = false
  }

  const [items, total] = await Promise.all([
    prisma.comment.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        content: true,
        flag: true,
        isDeleted: true,
        createdAt: true,
        userId: true,
        dramaId: true,
      },
    }),
    prisma.comment.count({ where: where as any }),
  ])

  // 批量查用户名和剧名
  const userIds = [...new Set(items.map(i => i.userId))]
  const dramaIds = [...new Set(items.map(i => i.dramaId))]
  const [users, dramas] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, mutedUntil: true },
    }),
    prisma.drama.findMany({
      where: { id: { in: dramaIds } },
      select: { id: true, title: true, slug: true },
    }),
  ])

  const userMap = Object.fromEntries(users.map(u => [u.id, { username: u.username, mutedUntil: u.mutedUntil?.toISOString() }]))
  const dramaMap = Object.fromEntries(dramas.map(d => [d.id, { title: d.title, slug: d.slug }]))

  const enriched = items.map(item => ({
    id: item.id,
    content: item.content,
    flag: item.flag,
    createdAt: item.createdAt.toISOString(),
    userId: item.userId,
    username: userMap[item.userId]?.username || '已注销',
    mutedUntil: userMap[item.userId]?.mutedUntil || null,
    dramaTitle: dramaMap[item.dramaId]?.title || '未知剧集',
    dramaSlug: dramaMap[item.dramaId]?.slug || '',
  }))

  return NextResponse.json({
    items: enriched,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}

// POST /api/admin/comments →  body: { commentId, action }
// action = 'restore' → 恢复（flag=clean, isDeleted=false）
// action = 'delete'  → 软删除（flag=toxic, isDeleted=true）
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '无权访问' }, { status: 403 })
  }

  const body = await request.json()
  const { commentId, action } = body
  if (!commentId) return NextResponse.json({ error: '缺少 commentId' }, { status: 400 })

  const comment = await prisma.comment.findUnique({ where: { id: commentId } })
  if (!comment) return NextResponse.json({ error: '评论不存在' }, { status: 404 })

  if (action === 'restore') {
    await prisma.comment.update({
      where: { id: commentId },
      data: { flag: 'clean', isDeleted: false },
    })
    return NextResponse.json({ ok: true, message: '评论已恢复' })
  }

  // 默认 delete（软删除）
  await prisma.comment.update({
    where: { id: commentId },
    data: { flag: 'toxic', isDeleted: true },
  })
  return NextResponse.json({ ok: true, message: '评论已删除' })
}
