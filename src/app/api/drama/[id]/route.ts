import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
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

  if (body.action === 'complete') {
    const drama = await prisma.drama.update({
      where: { id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
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
    title, slug, coverImage, description, region, tags,
    isOnSchedule, isNewlyAired, isUpcoming,
    airDays, airTime, expectedDate, expectedPrecision,
    totalEpisodes, currentEpisode, manualEpisode,
    isCompleted, startDate,
    sortOrder, videoUrl, videoLabel, seriesGroup, seriesOrder, episodesPerDay, downloadLinks,
  } = body

  // 更换封面时，删除旧的上传文件
  const oldDrama = await prisma.drama.findUnique({ where: { id }, select: { coverImage: true } })
  if (oldDrama?.coverImage && oldDrama.coverImage !== coverImage) {
    await deleteCoverFile(oldDrama.coverImage)
  }

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
        isOnSchedule,
        isNewlyAired,
        isUpcoming,
        airDays,
        airTime,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        expectedPrecision,
        totalEpisodes,
        currentEpisode,
        manualEpisode,
        isCompleted,
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

  return NextResponse.json(drama)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params
  const drama = await prisma.drama.findUnique({ where: { id }, select: { coverImage: true } })
  if (drama?.coverImage) {
    await deleteCoverFile(drama.coverImage)
  }
  await prisma.drama.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
