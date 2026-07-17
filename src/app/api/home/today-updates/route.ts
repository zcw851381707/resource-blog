import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcCurrentEpisode } from '@/lib/drama-schedule-utils'

// GET /api/home/today-updates
// 返回今天有更新的剧（根据 airDays + startDate 算出今天本来应该播出）
// 数据基础：复用 calcCurrentEpisode 计算当前理论集数，对比数据库 currentEpisode
export async function GET() {
  try {
    const now = new Date()
    // 今天是周几（JS 周日=0, 周一=1...周六=6，转换为我们系统：周一=0, 周日=6）
    const todayDow = now.getDay() === 0 ? 6 : now.getDay() - 1

    // 查所有在播或新播的剧（airDays 不为空）
    const dramas = await prisma.drama.findMany({
      where: {
        OR: [
          { isOnSchedule: true },
          { isNewlyAired: true },
        ],
        isCompleted: false,
        airDays: { not: null },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        imagePosition: true,
        currentEpisode: true,
        manualEpisode: true,
        airDays: true,
        airTime: true,
        totalEpisodes: true,
        startDate: true,
        premiereEpisodes: true,
        episodesPerDay: true,
      },
    })

    // 过滤出"今天本应播出"的剧
    const todayUpdates: typeof dramas = []
    for (const d of dramas) {
      if (!d.startDate) continue

      // 情况 1：airDays 已填，且包含今天 → 常规播出日
      // 情况 2：airDays 未填（刚开播的新剧），但 startDate 是今天 → 今天首播
      const airDaysList = d.airDays ? d.airDays.split(',').map(s => s.trim()) : []
      const isRegularAirDay = airDaysList.includes(String(todayDow))
      // 用本地时区比较日期（避免服务器 UTC 时区导致日期偏移）
      const localDateStr = (dt: Date) => {
        const y = dt.getFullYear()
        const m = String(dt.getMonth() + 1).padStart(2, '0')
        const d2 = String(dt.getDate()).padStart(2, '0')
        return `${y}-${m}-${d2}`
      }
      const isPremiereToday = localDateStr(d.startDate) === localDateStr(now)

      if (!isRegularAirDay && !isPremiereToday) continue

      // 算出理论当前集数（首播剧没 airDays 时给个空字符串兜底）
      const theoreticalEp = calcCurrentEpisode({
        currentEpisode: d.currentEpisode,
        manualEpisode: d.manualEpisode,
        startDate: d.startDate.toISOString(),
        premiereEpisodes: d.premiereEpisodes,
        episodesPerDay: d.episodesPerDay,
        airDays: d.airDays || '',
        airTime: d.airTime,
      })

      // 理论集数 > 0 表示开播了，且当前集数（数据库）应该 >= 1
      // 首播剧今天首次出现，currentEpisode 可能还没及时同步，theoreticalEp 已经能算出来
      if (isPremiereToday || (theoreticalEp > 0 && (d.currentEpisode || 0) >= 1)) {
        todayUpdates.push(d)
      }
    }

    // 按 currentEpisode 倒序（最新集数在前）
    todayUpdates.sort((a, b) => (b.currentEpisode || 0) - (a.currentEpisode || 0))

    return NextResponse.json({ items: todayUpdates.slice(0, 10) })
  } catch (err) {
    console.error('GET /api/home/today-updates error:', err)
    return NextResponse.json({ items: [] })
  }
}