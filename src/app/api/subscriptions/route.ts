import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/subscriptions — 我的预约列表（含剧集信息 + 预约人数统计）
// 可选参数: ?dramaId=xxx 单查某个剧的预约数和我的状态
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const singleDramaId = searchParams.get('dramaId')

  // 详情页用：单查某个剧
  if (singleDramaId) {
    const [mySub, count] = await Promise.all([
      prisma.dramaSubscription.findUnique({
        where: { userId_dramaId: { userId: session.userId, dramaId: singleDramaId } },
      }),
      prisma.dramaSubscription.count({ where: { dramaId: singleDramaId } }),
    ])
    return NextResponse.json({
      subscribed: !!mySub,
      count,
    })
  }

  // 我的预约列表
  const items = await prisma.dramaSubscription.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  })

  if (items.length === 0) {
    return NextResponse.json({ items: [], dramas: {}, counts: {} })
  }

  const dramaIds = items.map(i => i.dramaId)
  const [dramas, groupCounts] = await Promise.all([
    prisma.drama.findMany({
      where: { id: { in: dramaIds } },
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        imagePosition: true,
        region: true,
        tags: true,
        isCompleted: true,
        isOnSchedule: true,
        isUpcoming: true,
        expectedDate: true,
        expectedPrecision: true,
        totalEpisodes: true,
        currentEpisode: true,
        manualEpisode: true,
        premiereEpisodes: true,
        startDate: true,
      },
    }),
    prisma.dramaSubscription.groupBy({
      by: ['dramaId'],
      where: { dramaId: { in: dramaIds } },
      _count: { dramaId: true },
    }),
  ])

  const dramaMap: Record<string, typeof dramas[number]> = {}
  dramas.forEach(d => { dramaMap[d.id] = d })
  const countMap: Record<string, number> = {}
  groupCounts.forEach(g => { countMap[g.dramaId] = g._count.dramaId })

  return NextResponse.json({ items, dramas: dramaMap, counts: countMap })
}

// POST /api/subscriptions — 切换预约状态
// body: { dramaId }
// 同一用户对同一剧只能预约 1 次，再次调用 = 取消
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const body = await request.json()
  const { dramaId } = body
  if (!dramaId) return NextResponse.json({ error: '缺少 dramaId' }, { status: 400 })

  // 确认剧集存在
  const drama = await prisma.drama.findUnique({ where: { id: dramaId }, select: { id: true, isUpcoming: true } })
  if (!drama) return NextResponse.json({ error: '剧集不存在' }, { status: 404 })

  // 查询是否已预约
  const existing = await prisma.dramaSubscription.findUnique({
    where: { userId_dramaId: { userId: session.userId, dramaId } },
  })

  if (existing) {
    await prisma.dramaSubscription.delete({ where: { id: existing.id } })
    const count = await prisma.dramaSubscription.count({ where: { dramaId } })
    return NextResponse.json({ ok: true, subscribed: false, count })
  } else {
    await prisma.dramaSubscription.create({
      data: { userId: session.userId, dramaId },
    })
    const count = await prisma.dramaSubscription.count({ where: { dramaId } })
    return NextResponse.json({ ok: true, subscribed: true, count })
  }
}
