const NEWLY_AIRED_DAYS = 45

/** 判断"即将上线"是否仍有效：isUpcoming=1 且预计/首播日期尚未到达，
 *  或日期是今天但播出时间还没到。 */
export function isUpcomingActive(drama: {
  isUpcoming?: boolean | null
  startDate?: Date | string | null
  expectedDate?: Date | string | null
  airTime?: string | null
}): boolean {
  if (!drama.isUpcoming) return false
  const refDate = drama.startDate || drama.expectedDate
  if (!refDate) return true // 没有日期，保留即将上线状态
  const now = new Date()
  const ref = new Date(refDate)
  ref.setHours(0, 0, 0, 0)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // 日期在未来 → 仍在即将上线
  if (ref > today) return true
  // 日期在过去 → 已开播
  if (ref < today) return false
  // 日期是今天：检查播出时间是否已到
  if (drama.airTime) {
    const [h, m] = drama.airTime.split(':').map(Number)
    if (!isNaN(h) && !isNaN(m)) {
      const airMinutes = h * 60 + m
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      return nowMinutes < airMinutes // 还没到播出时间 → 仍在即将上线
    }
  }
  return false // 已到播出时间或未设置 → 已开播
}

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

/** 根据首播日期 + 播出日 + 集数规则自动计算当前集数。
 *  第一个更新日 = premiereEpisodes（或 episodesPerDay），之后每个 +episodesPerDay。
 *  当天的播出：未到 airTime 不算已播（按"播出时间到达后"才算）。
 *  优先返回 manualEpisode；未设置或 0 时按规则计算。 */
export function calcCurrentEpisode(drama: {
  currentEpisode?: number | null
  manualEpisode?: number | null
  startDate?: Date | string | null
  premiereEpisodes?: number | null
  episodesPerDay?: number | null
  airDays?: string | null
  airTime?: string | null
}): number {
  // 手动指定的集数优先（0 视为未设置）
  if (drama.manualEpisode != null && drama.manualEpisode > 0) {
    return drama.manualEpisode
  }
  const start = drama.startDate ? new Date(drama.startDate) : null
  if (!start || start > new Date()) return drama.currentEpisode || 0

  const airDays = (drama.airDays || '').split(',').map(s => s.trim()).filter(Boolean)
  if (airDays.length === 0) return drama.currentEpisode || 0

  const prem = drama.premiereEpisodes || drama.episodesPerDay || 1
  const epd = drama.episodesPerDay || 1

  // 解析播出时间（默认 20:00）
  const [airH = 20, airM = 0] = (drama.airTime || '20:00').split(':').map(Number)
  const airMinutes = airH * 60 + airM

  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const startDay = new Date(start)
  startDay.setHours(0, 0, 0, 0)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  let airCount = 0
  const cursor = new Date(startDay)
  while (cursor <= today) {
    const jsDay = cursor.getDay()
    const formDay = String(jsDay === 0 ? 6 : jsDay - 1)
    if (airDays.includes(formDay)) {
      // 今天：必须到 airTime 才算播；之前的日期：都算播
      const isToday = cursor.getTime() === today.getTime()
      if (!isToday || nowMinutes >= airMinutes) {
        airCount++
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  if (airCount === 0) return drama.currentEpisode || 0
  const autoEp = prem + (airCount - 1) * epd
  return Math.max(autoEp, drama.currentEpisode ?? 0)
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

    // 首播时间已过 → 按正常播出加入日历，不再走"即将上线"逻辑
    if (!isUpcomingActive(drama)) {
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
      continue
    }

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
