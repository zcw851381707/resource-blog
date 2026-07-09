import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import DramaDetailClient from './DramaDetailClient'
import { hydrateDramaDisplayFields } from '@/lib/drama-schedule'

export default async function DramaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const drama = await prisma.drama.findUnique({
    where: { slug },
    include: { downloadLinks: true },
  })

  if (!drama) notFound()

  // 用原始 SQL 获取 videoUrl 和 seriesGroup（绕过 Prisma client 未重新生成的问题）
  const extraResult = await prisma.$queryRawUnsafe<Array<{ videoUrl: string | null; videoLabel: string | null; seriesGroup: string | null; seriesOrder: number | null; imagePosition: string | null; originalTitle: string | null; scheduleImage: string | null; galleryImages: string | null; premiereEpisodes: number | null }>>(
    `SELECT videoUrl, videoLabel, seriesGroup, seriesOrder, imagePosition, originalTitle, scheduleImage, galleryImages, premiereEpisodes FROM Drama WHERE id = ?`, drama.id
  )
  const videoUrl = extraResult[0]?.videoUrl || null
  const videoLabel = extraResult[0]?.videoLabel || null
  const seriesGroup = extraResult[0]?.seriesGroup || null
  const seriesOrder = extraResult[0]?.seriesOrder || 0
  const imagePosition = extraResult[0]?.imagePosition || null
  const originalTitle = extraResult[0]?.originalTitle || null
  const scheduleImage = extraResult[0]?.scheduleImage || null
  const premiereEpisodes = extraResult[0]?.premiereEpisodes || null
  let galleryImages: string[] = []
  try {
    const raw = extraResult[0]?.galleryImages
    if (raw) galleryImages = JSON.parse(raw)
  } catch { /* ignore */ }

  // 同系列其他季
  let seasons: Array<{ slug: string; title: string; seriesOrder: number }> = []
  if (seriesGroup) {
    seasons = await prisma.$queryRawUnsafe<Array<{ slug: string; title: string; seriesOrder: number }>>(
      `SELECT slug, title, seriesOrder FROM Drama WHERE seriesGroup = ? AND id != ? ORDER BY seriesOrder ASC`, seriesGroup, drama.id
    )
  }

  // 点击量 +1
  prisma.drama.update({
    where: { id: drama.id },
    data: { clickCount: { increment: 1 } },
  }).catch(() => {})

  // 首播日自动过渡：仅首次开播（currentEp=0）触发，不影响后台手动修改的数据
  if (drama.isUpcoming && drama.expectedDate && (drama.currentEpisode || 0) === 0 && (drama.manualEpisode || 0) === 0) {
    const expected = new Date(drama.expectedDate)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const expDay = new Date(expected.getFullYear(), expected.getMonth(), expected.getDate())
    if (expDay <= today) {
      let ready = true
      if (drama.airTime) {
        const [h, m] = drama.airTime.split(':').map(Number)
        if (!isNaN(h) && !isNaN(m)) {
          if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) ready = false
        }
      }
      if (ready) {
        const premEp = premiereEpisodes || (drama.episodesPerDay || 1)
        prisma.drama.update({
          where: { id: drama.id },
          data: {
            isUpcoming: false,
            isNewlyAired: true,
            isOnSchedule: !!drama.airDays,
            currentEpisode: premEp,
          },
        }).catch(() => {})
      }
    }
  }

  // 热门推荐（按点击量）
  const [related, settings] = await Promise.all([
    prisma.drama.findMany({
      where: { id: { not: drama.id } },
      orderBy: { clickCount: 'desc' },
      take: 8,
    }),
    prisma.siteSettings.findFirst(),
  ])

  await hydrateDramaDisplayFields(related)

  const links = drama.downloadLinks || []

  return (
    <DramaDetailClient
      drama={{
        id: drama.id,
        title: drama.title,
        slug: drama.slug,
        coverImage: drama.coverImage,
        region: drama.region,
        category: drama.category,
        isCompleted: drama.isCompleted,
        completedAt: drama.completedAt?.toISOString() ?? null,
        isOnSchedule: drama.isOnSchedule,
        isNewlyAired: drama.isNewlyAired,
        isUpcoming: drama.isUpcoming,
        expectedDate: drama.expectedDate?.toISOString() ?? null,
        expectedPrecision: drama.expectedPrecision,
        tags: drama.tags,
        totalEpisodes: drama.totalEpisodes,
        currentEpisode: drama.currentEpisode,
        manualEpisode: drama.manualEpisode,
        airDays: drama.airDays,
        episodesPerDay: drama.episodesPerDay,
        airTime: drama.airTime,
        description: drama.description,
        videoUrl: videoUrl,
        videoLabel: videoLabel,
        seriesOrder: seriesOrder,
        imagePosition: imagePosition,
        originalTitle: originalTitle,
        scheduleImage: scheduleImage,
        startDate: drama.startDate?.toISOString() ?? null,
        premiereEpisodes: premiereEpisodes,
      }}
      seasons={seasons}
      related={related}
      links={links}
      publicAccountImg={settings?.publicAccountImg || null}
      tipQRCode={settings?.tipQRCode || null}
      tipButtonText={settings?.tipButtonText || '赞赏'}
      galleryImages={galleryImages}
    />
  )
}
