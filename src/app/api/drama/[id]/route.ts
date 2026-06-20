import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { calcCompletedAt } from '@/lib/drama-schedule'
import { unlink } from 'fs/promises'
import path from 'path'

async function deleteCoverFile(coverImage: string | null) {
  if (!coverImage) return
  // 兼容 /uploads/ 和 /api/uploads/ 两种路径
  const cleanPath = coverImage.startsWith('/api/uploads/') ? coverImage.replace('/api', '') : coverImage
  if (!cleanPath.startsWith('/uploads/')) return
  const filePath = path.join(process.cwd(), 'public', cleanPath)
  try { await unlink(filePath) } catch {}
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params
  const body = await request.json()

  if (body.action === 'pinTop') {
    const drama = await prisma.drama.update({
      where: { id },
      data: { sortOrder: body.sortOrder ?? -1 },
    })
    return NextResponse.json(drama)
  }

  if (body.action === 'complete') {
    // 获取播出日程，推算最后一集日期
    const row = await prisma.$queryRawUnsafe<Array<{ startDate: string | null; totalEpisodes: number | null; episodesPerDay: number | null; premiereEpisodes: number | null }>>(
      `SELECT startDate, totalEpisodes, episodesPerDay, premiereEpisodes FROM Drama WHERE id = ?`, id
    )
    const schedule = row?.[0]
    const completedAt = calcCompletedAt({
      startDate: schedule?.startDate,
      totalEpisodes: schedule?.totalEpisodes,
      episodesPerDay: schedule?.episodesPerDay,
      premiereEpisodes: schedule?.premiereEpisodes,
    }) || new Date()

    const drama = await prisma.drama.update({
      where: { id },
      data: {
        isCompleted: true,
        completedAt,
        isNewlyAired: false,
      },
    })
    return NextResponse.json(drama)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params
  const body = await request.json()
  const {
    title, slug, coverImage, description, region, tags, category,
    isOnSchedule, isNewlyAired, isUpcoming,
    airDays, airTime, expectedDate, expectedPrecision,
    totalEpisodes, currentEpisode, manualEpisode,
    isCompleted, startDate,
    sortOrder, videoUrl, videoLabel, seriesGroup, seriesOrder, episodesPerDay, premiereEpisodes, downloadLinks,
  } = body

  // 更换封面/日程图时，删除旧的上传文件（除非旧封面已挪入剧照仍在引用）
  const oldDrama = await prisma.drama.findUnique({ where: { id }, select: { coverImage: true, isCompleted: true, scheduleImage: true } })
  const newGallery: string[] = Array.isArray(body.galleryImages) ? body.galleryImages : []
  if (oldDrama?.coverImage && oldDrama.coverImage !== coverImage && !newGallery.includes(oldDrama.coverImage)) {
    await deleteCoverFile(oldDrama.coverImage)
  }
  if (oldDrama?.scheduleImage && oldDrama.scheduleImage !== body.scheduleImage) {
    await deleteCoverFile(oldDrama.scheduleImage)
  }

  // 自动管理完成状态：当前集数 >= 总集数 → 自动完结
  const autoCompleted = (body.currentEpisode != null && body.totalEpisodes != null && body.currentEpisode >= body.totalEpisodes)
  const finalIsCompleted = autoCompleted ? true : body.isCompleted === true ? true : false
  const finalCurrentEpisode = body.currentEpisode
  const finalManualEpisode = autoCompleted ? null : body.manualEpisode

  // 自动管理 completedAt：首次标记完结时按播出日程推算最后一集日期，取消完结时清空
  const completedAtValue = finalIsCompleted && !oldDrama?.isCompleted
    ? (calcCompletedAt({ startDate, totalEpisodes, episodesPerDay, premiereEpisodes }) || new Date())
    : !finalIsCompleted && oldDrama?.isCompleted
    ? null
    : undefined

  // 事务保护：删除旧链接和更新合并为原子操作
  const drama = await prisma.$transaction(async (tx) => {
    await tx.downloadLink.deleteMany({ where: { dramaId: id } })

    return tx.drama.update({
      where: { id },
      data: {
        title,
        slug,
        coverImage,
        description,
        region,
        tags,
        category: category || 'tv',
        isOnSchedule,
        isNewlyAired,
        isUpcoming,
        airDays,
        airTime,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        expectedPrecision,
        totalEpisodes,
        currentEpisode: finalCurrentEpisode,
        manualEpisode: finalManualEpisode,
        isCompleted: finalIsCompleted,
        premiereEpisodes,
        ...(completedAtValue !== undefined ? { completedAt: completedAtValue } : {}),
        startDate: startDate ? new Date(startDate) : null,
        sortOrder,
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
  })

  // 用原始 SQL 设置 videoUrl（绕过 Prisma client 未重新生成的问题）
  if (videoUrl !== undefined) {
    await prisma.$executeRawUnsafe(`UPDATE Drama SET videoUrl = ?, videoLabel = ? WHERE id = ?`, videoUrl || null, videoLabel || null, id)
  }
  if (seriesGroup !== undefined) {
    await prisma.$executeRawUnsafe(`UPDATE Drama SET seriesGroup = ?, seriesOrder = ? WHERE id = ?`, seriesGroup || null, seriesOrder || 0, id)
  }
  await prisma.$executeRawUnsafe(`UPDATE Drama SET episodesPerDay = ? WHERE id = ?`, episodesPerDay || 1, id)
  if (premiereEpisodes !== undefined) {
    await prisma.$executeRawUnsafe(`UPDATE Drama SET premiereEpisodes = ? WHERE id = ?`, premiereEpisodes || null, id)
  }
  if (body.imagePosition) {
    await prisma.$executeRawUnsafe(`UPDATE Drama SET imagePosition = ? WHERE id = ?`, body.imagePosition, id)
  }
  await prisma.$executeRawUnsafe(`UPDATE Drama SET originalTitle = ? WHERE id = ?`, body.originalTitle || '', id)
  if (body.isSuspended !== undefined) {
    await prisma.$executeRawUnsafe(`UPDATE Drama SET isSuspended = ? WHERE id = ?`, body.isSuspended ? 1 : 0, id)
  }
  if (body.pausedDays !== undefined) {
    await prisma.$executeRawUnsafe(`UPDATE Drama SET pausedDays = ? WHERE id = ?`, body.pausedDays || null, id)
  }
  if (body.scheduleImage !== undefined) {
    await prisma.$executeRawUnsafe(`UPDATE Drama SET scheduleImage = ? WHERE id = ?`, body.scheduleImage || null, id)
  }
  if (body.galleryImages !== undefined) {
    await prisma.$executeRawUnsafe(`UPDATE Drama SET galleryImages = ? WHERE id = ?`, JSON.stringify(body.galleryImages), id)
  }

  return NextResponse.json(drama)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params
  const drama = await prisma.drama.findUnique({ where: { id }, select: { coverImage: true, scheduleImage: true } })
  if (drama?.coverImage) await deleteCoverFile(drama.coverImage)
  if (drama?.scheduleImage) await deleteCoverFile(drama.scheduleImage)
  await prisma.drama.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
