import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

function getDeviceType(ua: string): string {
  const lower = ua.toLowerCase()
  if (/tablet|ipad|playbook|silk/i.test(lower)) return '平板'
  if (/mobile|iphone|ipod|android.*mobile|blackberry|windows phone/i.test(lower)) return '手机'
  if (/bot|crawler|spider/i.test(lower)) return '爬虫'
  return '电脑'
}

export async function GET(request: NextRequest) {
  await requireAuth()

  const now = new Date()
  const { searchParams } = new URL(request.url)
  const startDateStr = searchParams.get('startDate')
  const endDateStr = searchParams.get('endDate')

  // 默认最近 30 天
  const startDate = startDateStr ? new Date(startDateStr) : new Date(now.getTime() - 30 * 86400000)
  const endDate = endDateStr ? new Date(endDateStr) : now
  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(23, 59, 59, 999)

  const allTimeStart = new Date(0)

  // 并行查询
  const [totalPv, totalUv, periodPv, periodLogs, topDramas] = await Promise.all([
    // 总 PV（全量）
    prisma.visitLog.count(),
    // 总 UV（全量，按 IP 去重，使用原始 SQL 因为 ip 为可选字段）
    prisma.$queryRawUnsafe<Array<{ ip: string }>>('SELECT DISTINCT ip FROM VisitLog WHERE ip IS NOT NULL'),
    // 区间 PV
    prisma.visitLog.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
    // 区间日志（用于设备统计 + 页面排行 + 每日 PV）
    prisma.visitLog.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { path: true, ip: true, userAgent: true, createdAt: true },
    }),
    // 剧集热度 TOP 10
    prisma.drama.findMany({
      orderBy: { clickCount: 'desc' },
      take: 10,
      select: { id: true, title: true, slug: true, clickCount: true, region: true, coverImage: true },
    }),
  ])

  // 区间 UV（按 IP 去重）
  const uniqueIps = new Set(periodLogs.map(l => l.ip).filter(Boolean))
  const periodUv = uniqueIps.size

  // 每日 PV 和 UV
  const dailyMap = new Map<string, { pv: number; ips: Set<string> }>()
  for (const log of periodLogs) {
    const day = log.createdAt.toISOString().slice(0, 10)
    if (!dailyMap.has(day)) dailyMap.set(day, { pv: 0, ips: new Set() })
    const entry = dailyMap.get(day)!
    entry.pv++
    if (log.ip) entry.ips.add(log.ip)
  }
  const dailyStats = Array.from(dailyMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, data]) => ({ date, pv: data.pv, uv: data.ips.size }))

  // 设备分布
  const deviceCount: Record<string, number> = {}
  for (const log of periodLogs) {
    if (!log.userAgent) continue
    const type = getDeviceType(log.userAgent)
    deviceCount[type] = (deviceCount[type] || 0) + 1
  }
  const deviceStats = Object.entries(deviceCount)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => ({ type, count, percentage: Math.round((count / periodPv) * 100) }))

  // 页面排行
  const pageCount = new Map<string, number>()
  for (const log of periodLogs) {
    const path = log.path
    pageCount.set(path, (pageCount.get(path) || 0) + 1)
  }
  const topPages = Array.from(pageCount.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([path, count]) => ({ path, count, percentage: Math.round((count / periodPv) * 100) }))

  const totalUvCount = totalUv.length

  return NextResponse.json({
    totalPv,
    totalUv: totalUvCount,
    periodPv,
    periodUv,
    dailyStats,
    deviceStats,
    topPages,
    topDramas,
    dateRange: {
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
    },
  })
}
