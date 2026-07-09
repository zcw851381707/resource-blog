import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/favorites — 我的收藏列表（含剧集信息）
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const items = await prisma.userFavorite.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  })

  if (items.length === 0) {
    return NextResponse.json({ items: [], dramas: {} })
  }

  const dramaIds = items.map(i => i.dramaId)
  const dramas = await prisma.drama.findMany({
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
      totalEpisodes: true,
      currentEpisode: true,
      manualEpisode: true,
      premiereEpisodes: true,
      startDate: true,
      airDays: true,
      airTime: true,
      episodesPerDay: true,
    },
  })

  const dramaMap: Record<string, typeof dramas[number]> = {}
  dramas.forEach(d => { dramaMap[d.id] = d })

  return NextResponse.json({ items, dramas: dramaMap })
}

// POST /api/favorites — 切换收藏（已收藏则取消，未收藏则添加）
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const body = await request.json()
  const { dramaId } = body
  if (!dramaId) return NextResponse.json({ error: '缺少 dramaId' }, { status: 400 })

  // 确认剧集存在
  const drama = await prisma.drama.findUnique({ where: { id: dramaId }, select: { id: true } })
  if (!drama) return NextResponse.json({ error: '剧集不存在' }, { status: 404 })

  // 查询是否已收藏
  const existing = await prisma.userFavorite.findUnique({
    where: { userId_dramaId: { userId: session.userId, dramaId } },
  })

  if (existing) {
    await prisma.userFavorite.delete({ where: { id: existing.id } })
    return NextResponse.json({ ok: true, favorited: false })
  } else {
    await prisma.userFavorite.create({
      data: { userId: session.userId, dramaId },
    })
    return NextResponse.json({ ok: true, favorited: true })
  }
}
