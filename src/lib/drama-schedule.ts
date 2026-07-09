import { prisma } from '@/lib/prisma'

// 纯计算函数搬到 drama-schedule-utils.ts，避免拉 prisma 进客户端 bundle。
// 下方 re-export 保留服务器端旧 import 路径仍可工作。
export {
  isUpcomingActive,
  isNewlyAiredActive,
  isRecentlyCompleted,
  calcCompletedAt,
  calcCurrentEpisode,
  buildWeeklySchedule,
  type ScheduleDrama,
} from './drama-schedule-utils'

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
