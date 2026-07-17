import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/following/calendar?year=2026&month=7
// 返回用户当月每天追剧数据
// 数据基础：UserFollowing.updatedAt 作为"追剧日期"（简化方案，progress 无历史快照）
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const now = new Date()
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()))
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1)) // 1-12

    // 月初月末（用毫秒时间戳，因为数据库 updatedAt 存的是数字）
    const monthStart = new Date(year, month - 1, 1, 0, 0, 0).getTime()
    const monthEnd = new Date(year, month, 0, 23, 59, 59).getTime()

    // 查当月所有追剧记录（status = watching + completed）
    const items = await prisma.userFollowing.findMany({
      where: {
        userId: session.userId,
        status: { in: ['watching', 'completed'] },
        updatedAt: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // 按日期聚合（YYYY-MM-DD）
    const dayMap: Record<string, { count: number; episodes: number; dramaIds: string[] }> = {}
    items.forEach(it => {
      const d = new Date(it.updatedAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!dayMap[key]) {
        dayMap[key] = { count: 0, episodes: 0, dramaIds: [] }
      }
      dayMap[key].count++
      dayMap[key].episodes += it.progress
      if (!dayMap[key].dramaIds.includes(it.dramaId)) {
        dayMap[key].dramaIds.push(it.dramaId)
      }
    })

    // 统计：总天数、总集数
    const days = Object.keys(dayMap)
    const totalDays = days.length
    const totalEpisodes = items.reduce((sum, it) => sum + (it.progress || 0), 0)

    // 找本月追剧最多的剧
    const dramaCount: Record<string, number> = {}
    items.forEach(it => {
      dramaCount[it.dramaId] = (dramaCount[it.dramaId] || 0) + 1
    })
    const topDramaId = Object.entries(dramaCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null

    let topDramaTitle: string | null = null
    if (topDramaId) {
      const d = await prisma.drama.findUnique({
        where: { id: topDramaId },
        select: { title: true },
      })
      topDramaTitle = d?.title || null
    }

    return NextResponse.json({
      year,
      month,
      dayMap, // { '2026-07-01': { count, episodes, dramaIds }, ... }
      totalDays,
      totalEpisodes,
      topDramaId,
      topDramaTitle,
    })
  } catch (err) {
    console.error('GET /api/following/calendar error:', err)
    return NextResponse.json({ error: '查询失败' }, { status: 500 })
  }
}