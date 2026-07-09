import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { moderateComment } from '@/lib/moderation'

// GET /api/comments?dramaId=xxx&page=1&limit=10
//    或 /api/comments?myComments=true&page=1&limit=10  — 当前用户的评论
// 返回结构：置顶评论（pinned 单独一组在最前）+ 顶级评论（分页）+ 每条顶级评论的回复
export async function GET(request: NextRequest) {
  const dramaId = request.nextUrl.searchParams.get('dramaId')
  const myComments = request.nextUrl.searchParams.get('myComments') === 'true'
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '10')))
  const sort = request.nextUrl.searchParams.get('sort') || 'new' // new | hot

  const session = await getSession()

  // 个人中心：查当前用户自己的评论
  if (myComments) {
    if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 })
    const whereMy = {
      userId: session.userId,
      isDeleted: false,
      ...(session.role !== 'admin' ? { flag: 'clean' } : {}),
    } as any
    const [items, total] = await Promise.all([
      prisma.comment.findMany({
        where: whereMy,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, content: true, createdAt: true, userId: true, dramaId: true,
          likeCount: true, replyCount: true, pinned: true, parentId: true, replyToUser: true,
        },
      }),
      prisma.comment.count({ where: whereMy }),
    ])
    // 查剧名和slug
    const dramaIds = [...new Set(items.map(i => i.dramaId))]
    const dramas = dramaIds.length > 0
      ? await prisma.drama.findMany({
          where: { id: { in: dramaIds } },
          select: { id: true, title: true, slug: true },
        })
      : []
    const dramaMap = Object.fromEntries(dramas.map(d => [d.id, { title: d.title, slug: d.slug }]))
    const enriched = items.map(item => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      dramaTitle: dramaMap[item.dramaId]?.title || '',
      dramaSlug: dramaMap[item.dramaId]?.slug || '',
    }))
    return NextResponse.json({ items: enriched, total, page, totalPages: Math.ceil(total / limit) })
  }

  if (!dramaId) return NextResponse.json({ error: '缺少 dramaId' }, { status: 400 })

  // 评论资格：随时可评论（不再限制开播时间）
  const dramaMeta = await prisma.drama.findUnique({
    where: { id: dramaId },
    select: { id: true },
  })
  const canComment = !!dramaMeta
  const commentHint = ''

  const baseWhere: Record<string, unknown> = { dramaId, isDeleted: false }
  if (session?.role === 'admin') {
    baseWhere.OR = [{ flag: 'clean' }, { userId: session.userId }]
  } else {
    baseWhere.flag = 'clean'
  }
  // 顶级评论 = parentId 为 null
  const whereTopLevel = { ...baseWhere, parentId: null }

  // 排序
  const orderBy: any[] = sort === 'hot'
    ? [{ pinned: 'desc' }, { likeCount: 'desc' }, { createdAt: 'desc' }]
    : [{ pinned: 'desc' }, { createdAt: 'desc' }]

  // 1. 查询所有顶级评论（含置顶）
  const [topItems, total] = await Promise.all([
    prisma.comment.findMany({
      where: whereTopLevel as any,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, content: true, createdAt: true, userId: true, dramaId: true,
        likeCount: true, replyCount: true, pinned: true, parentId: true, replyToUser: true,
      },
    }),
    prisma.comment.count({ where: whereTopLevel as any }),
  ])

  // 2. 查询所有回复（这些顶级评论的）
  const topIds = topItems.map(c => c.id)
  const replyItems = topIds.length > 0 ? await prisma.comment.findMany({
    where: {
      dramaId,
      parentId: { in: topIds },
      isDeleted: false,
      ...(session?.role === 'admin' ? { OR: [{ flag: 'clean' }, { userId: session.userId }] } : { flag: 'clean' }),
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, content: true, createdAt: true, userId: true, dramaId: true,
      likeCount: true, replyCount: true, pinned: true, parentId: true, replyToUser: true,
    },
  }) : []

  // 3. 查所有用户信息
  const allItems = [...topItems, ...replyItems]
  const userIds = [...new Set(allItems.map(i => i.userId))]
  const dramaIds = [...new Set(allItems.map(i => i.dramaId))]

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

  // 4. 当前用户已点赞的评论 ID
  const allCommentIds = allItems.map(i => i.id)
  const likedSet = session && allCommentIds.length > 0
    ? new Set(
        (await prisma.commentLike.findMany({
          where: { userId: session.userId, commentId: { in: allCommentIds } },
          select: { commentId: true },
        })).map(l => l.commentId)
      )
    : new Set<string>()

  // 5. 查该剧首条评论（用于"首评"标签）
  const firstComment = await prisma.comment.findFirst({
    where: { dramaId, isDeleted: false, parentId: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  const firstCommentId = firstComment?.id || null

  const enrich = (item: typeof topItems[number] | typeof replyItems[number]) => ({
    id: item.id,
    content: item.content,
    createdAt: item.createdAt.toISOString(),
    isMine: session ? item.userId === session.userId : false,
    isFirstComment: item.id === firstCommentId,
    user: userMap[item.userId] || { username: '已注销', avatar: null, role: 'user' },
    isAdmin: userMap[item.userId]?.role === 'admin',
    dramaTitle: dramaMap[item.dramaId]?.title || '',
    dramaSlug: dramaMap[item.dramaId]?.slug || '',
    likeCount: item.likeCount,
    replyCount: item.replyCount,
    pinned: item.pinned,
    liked: likedSet.has(item.id),
    parentId: item.parentId,
    replyToUser: item.replyToUser,
  })

  // 5. 组装：每条顶级评论带 replies
  const replyMap = new Map<string, any[]>()
  for (const r of replyItems) {
    const arr = replyMap.get(r.parentId!) || []
    arr.push(enrich(r))
    replyMap.set(r.parentId!, arr)
  }
  const enrichedTops = topItems.map(item => ({ ...enrich(item), replies: replyMap.get(item.id) || [] }))

  return NextResponse.json({
    items: enrichedTops,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    canComment,
    commentHint,
  })
}

// POST /api/comments → { dramaId, content, parentId?, replyToUser? }
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { dramaId, content, parentId, replyToUser } = await request.json()
  if (!dramaId || !content || content.trim().length === 0) {
    return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 })
  }
  if (content.length > 500) {
    return NextResponse.json({ error: '评论不能超过 500 字' }, { status: 400 })
  }

  // 评论资格：登录用户随时可评论（不再限制开播时间）
  const dramaForComment = await prisma.drama.findUnique({
    where: { id: dramaId },
    select: { id: true },
  })
  if (!dramaForComment) {
    return NextResponse.json({ error: '剧不存在' }, { status: 404 })
  }

  // 检查是否被禁言
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { mutedUntil: true, role: true },
  })
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

  // 验证 parentId 是否存在
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { id: true, isDeleted: true },
    })
    if (!parent || parent.isDeleted) {
      return NextResponse.json({ error: '回复的评论不存在' }, { status: 400 })
    }
  }

  // 检查禁言词条
  const bannedWords = await prisma.bannedWord.findMany({ select: { word: true } })
  const lowerContent = content.trim().toLowerCase()
  const matchedWord = bannedWords.find(bw => lowerContent.includes(bw.word.toLowerCase()))
  if (matchedWord) {
    const comment = await prisma.comment.create({
      data: {
        userId: session.userId,
        dramaId,
        content: content.trim(),
        flag: 'toxic',
        isDeleted: true,
        parentId: parentId || null,
        replyToUser: replyToUser || null,
      },
    })
    return NextResponse.json({
      ok: true,
      id: comment.id,
      createdAt: comment.createdAt.toISOString(),
      flag: 'toxic',
      moderated: true,
      message: `评论因含禁用词"${matchedWord.word}"已被系统清除`,
    })
  }

  // 内容审核
  const { flag, isDeleted } = moderateComment(content.trim())

  const comment = await prisma.comment.create({
    data: {
      userId: session.userId,
      dramaId,
      content: content.trim(),
      flag,
      isDeleted,
      parentId: parentId || null,
      replyToUser: replyToUser || null,
    },
  })

  // 更新父评论的 replyCount
  if (parentId) {
    await prisma.comment.update({
      where: { id: parentId },
      data: { replyCount: { increment: 1 } },
    })
  }

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