import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const dramas = await prisma.drama.findMany({
    orderBy: { createdAt: 'desc' },
    include: { downloadLinks: true },
  })

  // 用原始 SQL 补上 videoUrl 和 videoLabel（绕过 Prisma client 未重新生成的问题）
  if (dramas.length > 0) {
    const ids = dramas.map(d => d.id)
    const placeholders = ids.map(() => '?').join(',')
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; videoUrl: string | null; videoLabel: string | null; seriesGroup: string | null; seriesOrder: number | null; episodesPerDay: number | null; imagePosition: string | null; originalTitle: string | null; pausedDays: string | null; isSuspended: number | null; scheduleImage: string | null; galleryImages: string | null }>>(
      `SELECT id, videoUrl, videoLabel, seriesGroup, seriesOrder, episodesPerDay, imagePosition, originalTitle, pausedDays, isSuspended, scheduleImage, galleryImages FROM Drama WHERE id IN (${placeholders})`, ...ids
    )
    const map = new Map(rows.map(r => [r.id, { videoUrl: r.videoUrl, videoLabel: r.videoLabel, seriesGroup: r.seriesGroup, seriesOrder: r.seriesOrder, episodesPerDay: r.episodesPerDay, imagePosition: r.imagePosition, originalTitle: r.originalTitle, pausedDays: r.pausedDays, isSuspended: r.isSuspended, scheduleImage: r.scheduleImage, galleryImages: r.galleryImages }]))
    for (const d of dramas) {
      const extra = map.get(d.id)
      if (extra) {
        ;(d as Record<string, unknown>).videoUrl = extra.videoUrl
        ;(d as Record<string, unknown>).videoLabel = extra.videoLabel
        ;(d as Record<string, unknown>).seriesGroup = extra.seriesGroup
        ;(d as Record<string, unknown>).seriesOrder = extra.seriesOrder
        ;(d as Record<string, unknown>).episodesPerDay = extra.episodesPerDay
        ;(d as Record<string, unknown>).imagePosition = extra.imagePosition
        ;(d as Record<string, unknown>).originalTitle = extra.originalTitle
        ;(d as Record<string, unknown>).pausedDays = extra.pausedDays
        ;(d as Record<string, unknown>).isSuspended = extra.isSuspended
        ;(d as Record<string, unknown>).scheduleImage = extra.scheduleImage
        ;(d as Record<string, unknown>).galleryImages = extra.galleryImages
      }
    }
  }

  return NextResponse.json(dramas)
}

export async function POST(request: NextRequest) {
  await requireAuth()
  const body = await request.json()
  const {
    title, slug, coverImage, description, region, tags,
    isOnSchedule, isNewlyAired, isUpcoming,
    airDays, airTime, expectedDate, expectedPrecision,
    totalEpisodes, currentEpisode, manualEpisode,
    isCompleted, startDate,
    sortOrder, videoUrl, videoLabel, seriesGroup, seriesOrder, episodesPerDay, downloadLinks, galleryImages,
  } = body

  const drama = await prisma.drama.create({
    data: {
      title,
      slug,
      coverImage,
      description,
      region,
      tags,
      isOnSchedule: isOnSchedule ?? false,
      isNewlyAired: isNewlyAired ?? false,
      isUpcoming: isUpcoming ?? false,
      airDays,
      airTime,
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      expectedPrecision: expectedPrecision ?? 'day',
      totalEpisodes,
      currentEpisode,
      manualEpisode,
      isCompleted: isCompleted ?? false,
      startDate: startDate ? new Date(startDate) : null,
      sortOrder: sortOrder ?? 0,
      scheduleImage: body.scheduleImage || null,
      downloadLinks: {
        create: (downloadLinks || [])
          .filter((l: { url: string }) => l.url)
          .map((l: { platform: string; url: string; extractCode?: string }) => ({
            platform: l.platform,
            url: l.url,
            extractCode: l.extractCode || null,
          })),
      },
    },
    include: { downloadLinks: true },
  })

  // 用原始 SQL 设置 videoUrl（绕过 Prisma client 未重新生成的问题）
  if (videoUrl) {
    await prisma.$executeRawUnsafe(`UPDATE Drama SET videoUrl = ?, videoLabel = ? WHERE id = ?`, videoUrl, videoLabel || null, drama.id)
  }
  if (seriesGroup) {
    await prisma.$executeRawUnsafe(`UPDATE Drama SET seriesGroup = ?, seriesOrder = ? WHERE id = ?`, seriesGroup, seriesOrder || 0, drama.id)
  }
  await prisma.$executeRawUnsafe(`UPDATE Drama SET episodesPerDay = ? WHERE id = ?`, episodesPerDay || 1, drama.id)
  if (body.imagePosition) {
    await prisma.$executeRawUnsafe(`UPDATE Drama SET imagePosition = ? WHERE id = ?`, body.imagePosition, drama.id)
  }
  await prisma.$executeRawUnsafe(`UPDATE Drama SET originalTitle = ? WHERE id = ?`, body.originalTitle || '', drama.id)
  if (body.isSuspended !== undefined) {
    await prisma.$executeRawUnsafe(`UPDATE Drama SET isSuspended = ? WHERE id = ?`, body.isSuspended ? 1 : 0, drama.id)
  }
  if (body.pausedDays !== undefined) {
    await prisma.$executeRawUnsafe(`UPDATE Drama SET pausedDays = ? WHERE id = ?`, body.pausedDays || null, drama.id)
  }
  if (galleryImages !== undefined) {
    await prisma.$executeRawUnsafe(`UPDATE Drama SET galleryImages = ? WHERE id = ?`, JSON.stringify(galleryImages), drama.id)
  }

  return NextResponse.json(drama, { status: 201 })
}
