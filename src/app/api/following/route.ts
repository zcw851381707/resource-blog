import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const VALID_STATUS = ['watching', 'planned', 'completed', 'dropped'] as const
type FollowingStatus = (typeof VALID_STATUS)[number]

// GET /api/following — 我的追剧列表（含剧集信息）
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // 可选过滤

  const where: { userId: string; status?: string } = { userId: session.userId }
  if (status && VALID_STATUS.includes(status as FollowingStatus)) {
    where.status = status
  }

  const items = await prisma.userFollowing.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
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
    },
  })

  const dramaMap: Record<string, typeof dramas[number]> = {}
  dramas.forEach(d => { dramaMap[d.id] = d })

  return NextResponse.json({ items, dramas: dramaMap })
}

// POST /api/following — 设置追剧状态
// body: { dramaId, status, progress? }
// - status === 'remove' 表示删除追剧记录
// - 其余 status 值为 watching/planned/completed/dropped
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const body = await request.json()
  const { dramaId, status, progress } = body

  if (!dramaId) return NextResponse.json({ error: '缺少 dramaId' }, { status: 400 })

  // 确认剧集存在
  const drama = await prisma.drama.findUnique({ where: { id: dramaId }, select: { id: true } })
  if (!drama) return NextResponse.json({ error: '剧集不存在' }, { status: 404 })

  // 取消追剧
  if (status === 'remove') {
    await prisma.userFollowing.deleteMany({
      where: { userId: session.userId, dramaId },
    })
    return NextResponse.json({ ok: true, following: null })
  }

  if (!VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: '无效的状态值' }, { status: 400 })
  }

  // upsert
  const item = await prisma.userFollowing.upsert({
    where: { userId_dramaId: { userId: session.userId, dramaId } },
    update: {
      status,
      progress: typeof progress === 'number' ? progress : undefined,
    },
    create: {
      userId: session.userId,
      dramaId,
      status,
      progress: typeof progress === 'number' ? progress : 0,
    },
  })

  return NextResponse.json({ ok: true, following: item })
}
