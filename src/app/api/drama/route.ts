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
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; videoUrl: string | null; videoLabel: string | null; seriesGroup: string | null; seriesOrder: number | null; episodesPerDay: number | null; imagePosition: string | null; originalTitle: string | null; pausedDays: string | null; isSuspended: number | null; scheduleImage: string | null; galleryImages: string | null; premiereEpisodes: number | null }>>(
      `SELECT id, videoUrl, videoLabel, seriesGroup, seriesOrder, episodesPerDay, imagePosition, originalTitle, pausedDays, isSuspended, scheduleImage, galleryImages, premiereEpisodes FROM Drama WHERE id IN (${placeholders})`, ...ids
    )
    const map = new Map(rows.map(r => [r.id, { videoUrl: r.videoUrl, videoLabel: r.videoLabel, seriesGroup: r.seriesGroup, seriesOrder: r.seriesOrder, episodesPerDay: r.episodesPerDay, imagePosition: r.imagePosition, originalTitle: r.originalTitle, pausedDays: r.pausedDays, isSuspended: r.isSuspended, scheduleImage: r.scheduleImage, galleryImages: r.galleryImages, premiereEpisodes: r.premiereEpisodes }]))
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
        ;(d as Record<string, unknown>).premiereEpisodes = extra.premiereEpisodes
      }
    }
  }

  return NextResponse.json(dramas)
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }

  const {
    title, slug, coverImage, description, region, tags, category,
    isOnSchedule, isNewlyAired, isUpcoming,
    airDays, airTime, expectedDate, expectedPrecision,
    totalEpisodes, currentEpisode, manualEpisode,
    isCompleted, startDate,
    sortOrder, videoUrl, videoLabel, seriesGroup, seriesOrder, episodesPerDay, downloadLinks, galleryImages,
  } = body

  try {
    const drama = await prisma.drama.create({
      data: {
        title: String(title || ''),
        slug: String(slug || ''),
        coverImage: coverImage as string | null,
        description: description as string | null,
        region: region as string | null,
        tags: tags as string | null,
        category: (category as string) || 'tv',
        isOnSchedule: (isOnSchedule as boolean) ?? false,
        isNewlyAired: (isNewlyAired as boolean) ?? false,
        isUpcoming: (isUpcoming as boolean) ?? false,
        airDays: airDays as string | null,
        airTime: airTime as string | null,
        expectedDate: expectedDate ? new Date(expectedDate as string) : null,
        expectedPrecision: (expectedPrecision as string) ?? 'day',
        totalEpisodes: totalEpisodes as number | null,
        currentEpisode: currentEpisode as number | null,
        manualEpisode: manualEpisode as number | null,
        isCompleted: (isCompleted as boolean) ?? false,
        startDate: startDate ? new Date(startDate as string) : null,
        sortOrder: (sortOrder as number) ?? 0,
        scheduleImage: (body.scheduleImage as string) || null,
        downloadLinks: {
          create: ((downloadLinks as Array<{ platform: string; url: string; extractCode?: string }>) || [])
            .filter((l) => l.url)
            .map((l) => ({
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
      await prisma.$executeRawUnsafe(`UPDATE Drama SET videoUrl = ?, videoLabel = ? WHERE id = ?`, videoUrl as string, (videoLabel as string) || null, drama.id)
    }
    if (seriesGroup) {
      await prisma.$executeRawUnsafe(`UPDATE Drama SET seriesGroup = ?, seriesOrder = ? WHERE id = ?`, seriesGroup as string, (seriesOrder as number) || 0, drama.id)
    }
    await prisma.$executeRawUnsafe(`UPDATE Drama SET episodesPerDay = ? WHERE id = ?`, (episodesPerDay as number) || 1, drama.id)
    if (body.imagePosition) {
      await prisma.$executeRawUnsafe(`UPDATE Drama SET imagePosition = ? WHERE id = ?`, body.imagePosition as string, drama.id)
    }
    await prisma.$executeRawUnsafe(`UPDATE Drama SET originalTitle = ? WHERE id = ?`, (body.originalTitle as string) || '', drama.id)
    if (body.isSuspended !== undefined) {
      await prisma.$executeRawUnsafe(`UPDATE Drama SET isSuspended = ? WHERE id = ?`, (body.isSuspended as boolean) ? 1 : 0, drama.id)
    }
    if (body.pausedDays !== undefined) {
      await prisma.$executeRawUnsafe(`UPDATE Drama SET pausedDays = ? WHERE id = ?`, (body.pausedDays as string) || null, drama.id)
    }
    if (galleryImages !== undefined) {
      await prisma.$executeRawUnsafe(`UPDATE Drama SET galleryImages = ? WHERE id = ?`, JSON.stringify(galleryImages), drama.id)
    }

    return NextResponse.json(drama, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('POST /api/drama error:', msg)
    return NextResponse.json({ error: `添加失败: ${msg}` }, { status: 500 })
  }
}
