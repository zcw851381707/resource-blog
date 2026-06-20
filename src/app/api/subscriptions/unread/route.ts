import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/subscriptions/unread — 统计已开播但未通知的预约数
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const subs = await prisma.dramaSubscription.findMany({
    where: { userId: session.userId, notified: false },
    select: { id: true, dramaId: true },
  })

  if (subs.length === 0) {
    return NextResponse.json({ count: 0 })
  }

  const dramaIds = subs.map(s => s.dramaId)
  const dramas = await prisma.drama.findMany({
    where: { id: { in: dramaIds } },
    select: { id: true, isCompleted: true, isOnSchedule: true, startDate: true, airTime: true, expectedDate: true },
  })

  const dramaMap = new Map(dramas.map(d => [d.id, d]))
  const now = new Date()

  function hasAired(d: typeof dramas[number]): boolean {
    if (d.isCompleted) return true
    if (d.startDate && new Date(d.startDate) <= now) return true
    if (d.isOnSchedule && d.expectedDate && new Date(d.expectedDate) <= now) return true
    if (d.isOnSchedule && d.airTime) {
      const [h, m] = d.airTime.split(':').map(Number)
      const todayAirTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0)
      if (now >= todayAirTime) return true
    }
    return false
  }

  let unreadCount = 0
  for (const sub of subs) {
    const d = dramaMap.get(sub.dramaId)
    if (d && hasAired(d)) unreadCount++
  }

  return NextResponse.json({ count: unreadCount })
}
