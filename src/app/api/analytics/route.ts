import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/analytics — 记录埋点事件（批量写入）
export async function POST(request: NextRequest) {
  const session = await getSession()
  const body = await request.json()
  const events = Array.isArray(body) ? body : [body]

  const userId = session?.userId || null
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const ua = request.headers.get('user-agent') || null

  try {
    await prisma.analyticsEvent.createMany({
      data: events.map((ev: { event: string; props?: Record<string, unknown>; page?: string }) => ({
        userId,
        event: ev.event,
        props: ev.props ? JSON.stringify(ev.props) : null,
        page: ev.page || null,
        ip,
        ua,
      })),
    })
  } catch {}

  return NextResponse.json({ ok: true })
}

// GET /api/analytics/stats — 管理员查看统计（日活/周活/热门剧）
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (session?.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [todayViews, weeklyViews, monthlyViews, todayRegistered, todayGuest, topPages] = await Promise.all([
    prisma.analyticsEvent.count({ where: { createdAt: { gte: todayStart }, event: 'page_view' } }),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: weekAgo }, event: 'page_view' } }),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: monthAgo }, event: 'page_view' } }),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: todayStart }, event: 'page_view', userId: { not: null } } }),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: todayStart }, event: 'page_view', userId: null } }),
    prisma.$queryRawUnsafe<Array<{ page: string; count: number }>>(
      `SELECT page, COUNT(*) as count FROM AnalyticsEvent WHERE event = 'page_view' AND page IS NOT NULL AND createdAt >= ? GROUP BY page ORDER BY count DESC LIMIT 10`, monthAgo.toISOString()
    ),
  ])

  const activeUsers30d = await prisma.analyticsEvent.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: monthAgo }, userId: { not: null } },
    _count: true,
  })

  return NextResponse.json({
    todayViews, weeklyViews, monthlyViews,
    todayRegistered, todayGuest,
    topPages: Array.isArray(topPages) ? topPages : [],
    recentUsers: activeUsers30d.length,
  })
}
