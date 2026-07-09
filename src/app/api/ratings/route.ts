import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/ratings?dramaId=xxx
export async function GET(request: NextRequest) {
  const dramaId = request.nextUrl.searchParams.get('dramaId')
  if (!dramaId) return NextResponse.json({ error: '缺少 dramaId' }, { status: 400 })

  const session = await getSession()

  const [allRatings, myRating, drama] = await Promise.all([
    prisma.rating.findMany({ where: { dramaId }, select: { score: true } }),
    session
      ? prisma.rating.findUnique({
          where: { userId_dramaId: { userId: session.userId, dramaId } },
          select: { score: true, updateCount: true },
        })
      : null,
    prisma.drama.findUnique({
      where: { id: dramaId },
      select: { startDate: true, isCompleted: true },
    }),
  ])

  const total = allRatings.length
  const avgStar = total > 0
    ? Math.round((allRatings.reduce((s, r) => s + r.score, 0) / total) * 10) / 10
    : 0
  // 10 分制：1星=2分, 5星=10分
  const tenPointScore = total > 0
    ? Math.round(avgStar * 2 * 10) / 10
    : 0

  // 出分条件：播出后（含首播当天）且评价人数 ≥ 10
  let hasAired = false
  if (drama?.isCompleted) {
    hasAired = true
  } else if (drama?.startDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDay = new Date(drama.startDate)
    startDay.setHours(0, 0, 0, 0)
    if (startDay <= today) hasAired = true
  }
  const enoughRatings = total >= 10
  const showScore = hasAired && enoughRatings

  const distribution = [0, 0, 0, 0, 0]
  allRatings.forEach(r => { if (r.score >= 1 && r.score <= 5) distribution[r.score - 1]++ })

  return NextResponse.json({
    avgRating: avgStar,
    tenPointScore,
    count: total,
    distribution,
    myRating: myRating?.score ?? null,
    updateCount: myRating?.updateCount ?? 0,
    remainingUpdates: Math.max(0, 3 - (myRating?.updateCount ?? 0)),
    showScore,
    canRate: !!drama,
    scoreHint: !drama
      ? ''
      : !hasAired
        ? '播出后才能显示评分'
        : !enoughRatings
          ? `仅 ${total} 人评价，满 10 人后显示评分`
          : '',
  })
}

// POST /api/ratings → { dramaId, score }
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { dramaId, score } = await request.json()
  if (!dramaId || !score || score < 1 || score > 5) {
    return NextResponse.json({ error: '评分无效（1-5星）' }, { status: 400 })
  }

  const drama = await prisma.drama.findUnique({
    where: { id: dramaId },
    select: { id: true },
  })
  if (!drama) return NextResponse.json({ error: '剧不存在' }, { status: 404 })

  // UPSERT：已有评分则更新，没有则创建
  // 限制最多修改 3 次（总共可评 4 次：首次 + 3 次修改）
  const existing = await prisma.rating.findUnique({
    where: { userId_dramaId: { userId: session.userId, dramaId } },
    select: { updateCount: true },
  })
  if (existing && existing.updateCount >= 3) {
    return NextResponse.json({ error: '评分最多只能修改 3 次，已达上限' }, { status: 403 })
  }

  const rating = await prisma.rating.upsert({
    where: { userId_dramaId: { userId: session.userId, dramaId } },
    update: {
      score,
      updateCount: { increment: 1 },
    },
    create: { userId: session.userId, dramaId, score },
  })

  return NextResponse.json({
    ok: true,
    score: rating.score,
    updateCount: rating.updateCount,
    remainingUpdates: Math.max(0, 3 - rating.updateCount),
  })
}
