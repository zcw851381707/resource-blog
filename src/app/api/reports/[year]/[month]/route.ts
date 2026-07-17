import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/reports/2026/7 — 当月追剧报告（首次自动生成并缓存）
export async function GET(request: NextRequest, { params }: { params: Promise<{ year: string; month: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { year, month } = await params
  const y = parseInt(year)
  const m = parseInt(month)
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
    return NextResponse.json({ error: '日期无效' }, { status: 400 })
  }

  // 查询已缓存的报告
  const cached = await prisma.monthlyReport.findUnique({
    where: { userId_year_month: { userId: session.userId, year: y, month: m } },
  })
  if (cached && cached.totalDramas > 0) {
    return NextResponse.json({
      ...cached,
      topDrama: cached.topDramaId ? await prisma.drama.findUnique({ where: { id: cached.topDramaId }, select: { title: true, slug: true } }) : null,
    })
  }

  // 计算该月的日期范围
  const startDate = new Date(y, m - 1, 1)
  const endDate = new Date(y, m, 0, 23, 59, 59, 999)

  // 统计该月的追剧记录
  const followings = await prisma.userFollowing.findMany({
    where: {
      userId: session.userId,
      updatedAt: { gte: startDate, lte: endDate },
      status: { in: ['watching', 'completed'] },
    },
  })

  // 统计该月的评论数
  const comments = await prisma.comment.findMany({
    where: {
      userId: session.userId,
      createdAt: { gte: startDate, lte: endDate },
      isDeleted: false,
    },
  })

  // 计算总集数（progress 总和）
  const totalEpisodes = followings.reduce((sum, f) => sum + f.progress, 0)
  const totalDramas = new Set(followings.map(f => f.dramaId)).size
  const completedDramas = followings.filter(f => f.status === 'completed').length

  // 追最多集的剧
  const dramaEpCounts = new Map<string, number>()
  for (const f of followings) {
    dramaEpCounts.set(f.dramaId, (dramaEpCounts.get(f.dramaId) || 0) + f.progress)
  }
  let topDramaId: string | null = null
  let maxEp = 0
  for (const [did, count] of dramaEpCounts) {
    if (count > maxEp) { maxEp = count; topDramaId = did }
  }

  // 保存到 MonthlyReport（upsert 避免重复创建冲突）
  const report = await prisma.monthlyReport.upsert({
    where: { userId_year_month: { userId: session.userId, year: y, month: m } },
    update: { totalEpisodes, totalDramas, completedDramas, topDramaId },
    create: {
      userId: session.userId,
      year: y,
      month: m,
      totalEpisodes,
      totalDramas,
      completedDramas,
      topDramaId,
    },
  })

  // 查询 top 剧名
  const topDrama = topDramaId ? await prisma.drama.findUnique({ where: { id: topDramaId }, select: { title: true, slug: true } }) : null

  return NextResponse.json({ ...report, topDrama })
}
