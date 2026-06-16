import { prisma } from '@/lib/prisma'

const NEWLY_AIRED_DAYS = 45

/** 判断新播标签是否仍在有效期内（首播后 45 天内） */
export function isNewlyAiredActive(drama: {
  isNewlyAired?: boolean | null
  startDate?: Date | string | null
  expectedDate?: Date | string | null
}): boolean {
  if (!drama.isNewlyAired) return false
  const refDate = drama.startDate || drama.expectedDate
  if (!refDate) return true // 没有日期，保留标签
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - NEWLY_AIRED_DAYS)
  return new Date(refDate) >= cutoff
}

const RECENTLY_COMPLETED_DAYS = 30

/** 判断已完结标签是否仍在有效期内（完结后 30 天内）。
 *  老剧补录（completedAt 为空）不显示标签。 */
export function isRecentlyCompleted(drama: {
  isCompleted?: boolean | null
  completedAt?: Date | string | null
}): boolean {
  if (!drama.isCompleted) return false
  if (!drama.completedAt) return false // 老剧补录，不显示标签
  const completedDate = new Date(drama.completedAt)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RECENTLY_COMPLETED_DAYS)
  return completedDate >= cutoff
}

/** 按播出日程推算最后一集日期（首播日当天算第 1 集）。
 *  首播连更 N 集（premiereEpisodes），之后每天 episodesPerDay 集。
 *  返回的日期是最后一集播出的当天。 */
export function calcCompletedAt(drama: {
  startDate?: Date | string | null
  totalEpisodes?: number | null
  episodesPerDay?: number | null
  premiereEpisodes?: number | null
}): Date | null {
  if (!drama.startDate || !drama.totalEpisodes) return null
  const epd = drama.episodesPerDay || 1
  const pre = drama.premiereEpisodes || epd
  const remaining = drama.totalEpisodes - pre
  const daysAfter = remaining <= 0 ? 0 : Math.ceil(remaining / epd)
  const d = new Date(drama.startDate)
  d.setDate(d.getDate() + daysAfter)
  return d
}

export type ScheduleDrama = {
  id: string
  airDays?: string | null
  airTime?: string | null
  expectedDate?: Date | string | null
  expectedPrecision?: string | null
  isCompleted?: boolean
  completedAt?: Date | string | null
  isOnSchedule?: boolean
  isUpcoming?: boolean
} & Record<string, unknown>

export async function hydrateDramaDisplayFields(dramas: Array<{ id: string } & Record<string, unknown>>) {
  if (dramas.length === 0) return

  const ids = dramas.map(d => d.id)
  const placeholders = ids.map(() => '?').join(',')
  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string
    episodesPerDay: number | null
    imagePosition: string | null
    originalTitle: string | null
    seriesGroup: string | null
    seriesOrder: number | null
    premiereEpisodes: number | null
  }>>(
    `SELECT id, episodesPerDay, imagePosition, originalTitle, seriesGroup, seriesOrder, premiereEpisodes FROM Drama WHERE id IN (${placeholders})`,
    ...ids
  )
  const extraMap = new Map(rows.map(r => [r.id, r]))

  for (const drama of dramas) {
    const extra = extraMap.get(drama.id)
    drama.episodesPerDay = extra?.episodesPerDay ?? 1
    drama.imagePosition = extra?.imagePosition ?? null
    drama.originalTitle = extra?.originalTitle ?? null
    drama.seriesGroup = extra?.seriesGroup ?? null
    drama.seriesOrder = extra?.seriesOrder ?? 0
    drama.premiereEpisodes = extra?.premiereEpisodes ?? null
  }
}

export function buildWeeklySchedule<T extends ScheduleDrama>(dramas: T[], now = new Date()): Record<string, T[]> {
  const schedule: Record<string, T[]> = {}
  for (let i = 0; i < 7; i++) schedule[String(i)] = []

  // 计算本周一的 0:00
  const monday = new Date(now)
  monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))
  monday.setHours(0, 0, 0, 0)

  for (const drama of dramas) {
    if (drama.isOnSchedule && drama.airDays) {
      const days = drama.airDays.split(',').map(d => d.trim())

      // 已完结：完结日之前的播出日保留，之后的移除
      if (drama.isCompleted) {
        const completedDate = drama.completedAt ? new Date(drama.completedAt) : null
        if (!completedDate) continue // 无完结日期，跳过
        if (completedDate < monday) continue // 完结于本周前，整周不显示
        // 完结时间 > 30 天后的一律视为老剧补录（推算不准），不显示
        const cutoff = new Date(now)
        cutoff.setDate(cutoff.getDate() + 30)
        if (completedDate > cutoff) continue

        // 本周内完结：只保留完结日当天及之前的播出日
        const completedDayOfWeek = completedDate.getDay() === 0 ? 6 : completedDate.getDay() - 1
        for (const day of days) {
          if (parseInt(day) <= completedDayOfWeek && schedule[day]) {
            schedule[day].push(drama)
          }
        }
        continue
      }

      for (const day of days) {
        if (schedule[day]) schedule[day].push(drama)
      }
    }
  }

  // 新播剧：即使没勾 isOnSchedule，只要新播（45天内）且有播出日就进日历
  for (const drama of dramas) {
    if (drama.isOnSchedule && drama.airDays) continue // 上面已处理
    if (drama.isCompleted) continue
    if (!isNewlyAiredActive(drama as any)) continue

    const refDate: Date | null = (drama as any).startDate ? new Date((drama as any).startDate) : drama.expectedDate ? new Date(drama.expectedDate) : null
    if (!refDate) continue

    // airDays 优先；没有则从首播日期推导
    let days: string[]
    if (drama.airDays) {
      days = drama.airDays.split(',').map(d => d.trim())
    } else {
      const dayIndex = refDate.getDay() === 0 ? 6 : refDate.getDay() - 1
      days = [String(dayIndex)]
    }

    for (const day of days) {
      if (schedule[day] && !schedule[day].some(d => d.id === drama.id)) {
        schedule[day].push(drama)
      }
    }
  }

  // 即将上线（精确日期）：从目标周一开始进入追剧日历，和首页保持一致。
  for (const drama of dramas) {
    if (!drama.isUpcoming || !drama.expectedDate) continue
    if (drama.expectedPrecision !== 'day') continue

    const expected = new Date(drama.expectedDate)
    const expectedDay = expected.getDay() === 0 ? 6 : expected.getDay() - 1
    const monday = new Date(expected)
    monday.setDate(expected.getDate() - expectedDay)
    monday.setHours(0, 0, 0, 0)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    if (now > sunday) continue

    if (now >= monday) {
      if (drama.airDays) {
        const days = drama.airDays.split(',').map(d => d.trim())
        for (const day of days) {
          if (schedule[day] && !schedule[day].some(d => d.id === drama.id)) {
            schedule[day].push(drama)
          }
        }
      } else {
        const key = String(expectedDay)
        if (schedule[key] && !schedule[key].some(d => d.id === drama.id)) {
          schedule[key].push(drama)
        }
      }
    }
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const todayIdx = now.getDay()
  const todayKey = String(todayIdx === 0 ? 6 : todayIdx - 1)
  for (let i = 0; i < 7; i++) {
    const key = String(i)
    schedule[key].sort((a, b) => {
      if (!a.airTime && !b.airTime) return 0
      if (!a.airTime) return 1
      if (!b.airTime) return -1

      const [ah, am] = a.airTime.split(':').map(Number)
      const [bh, bm] = b.airTime.split(':').map(Number)
      const aMins = ah * 60 + am
      const bMins = bh * 60 + bm

      if (key === todayKey) {
        const aDiff = aMins - currentMinutes
        const bDiff = bMins - currentMinutes
        const getPriority = (diff: number) => {
          if (diff >= 0 && diff <= 30) return -1000
          if (diff > 30) return diff
          if (diff < -30) return 5000 - diff
          return Math.abs(diff)
        }
        return getPriority(aDiff) - getPriority(bDiff)
      }

      return aMins - bMins
    })
  }

  return schedule
}
