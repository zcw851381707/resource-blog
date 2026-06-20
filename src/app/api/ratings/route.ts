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
          select: { score: true },
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

  // 出分条件：
  // 1. 已完结 → 直接出分；未完结 → 需开播满 3 天
  // 2. 评价人数 ≥ 10
  let aired3Days = false
  if (drama?.isCompleted) {
    aired3Days = true
  } else if (drama?.startDate) {
    const daysSinceStart = (Date.now() - drama.startDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceStart >= 3) aired3Days = true
  }
  const enoughRatings = total >= 10
  const showScore = aired3Days && enoughRatings

  const distribution = [0, 0, 0, 0, 0]
  allRatings.forEach(r => { if (r.score >= 1 && r.score <= 5) distribution[r.score - 1]++ })

  return NextResponse.json({
    avgRating: avgStar,
    tenPointScore,
    count: total,
    distribution,
    myRating: myRating?.score ?? null,
    showScore,
    // 给前端的提示文案
    scoreHint: !aired3Days
      ? '开播满 3 天后出分'
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

  // UPSERT：已有评分则更新，没有则创建
  const rating = await prisma.rating.upsert({
    where: { userId_dramaId: { userId: session.userId, dramaId } },
    update: { score },
    create: { userId: session.userId, dramaId, score },
  })

  return NextResponse.json({ ok: true, score: rating.score })
}
