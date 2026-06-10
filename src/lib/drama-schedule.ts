import { prisma } from '@/lib/prisma'

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
  }>>(
    `SELECT id, episodesPerDay, imagePosition, originalTitle, seriesGroup, seriesOrder FROM Drama WHERE id IN (${placeholders})`,
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
      // 已完结：如果完结日期在本周一之前，不再显示；本周内完结的仍保留
      if (drama.isCompleted) {
        const completedDate = drama.completedAt ? new Date(drama.completedAt) : null
        if (completedDate && completedDate < monday) continue
        // 没有 completedAt 的旧数据，跳过（兼容）
        if (!completedDate) continue
      }
      const days = drama.airDays.split(',').map(d => d.trim())
      for (const day of days) {
        if (schedule[day]) schedule[day].push(drama)
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
