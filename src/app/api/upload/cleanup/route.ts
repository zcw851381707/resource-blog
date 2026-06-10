import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { readdir, unlink } from 'fs/promises'
import path from 'path'

// 获取所有被引用的文件：banners、dramas、sitesettings
async function getReferencedFiles(): Promise<Set<string>> {
  const refs = new Set<string>()

  const banners = await prisma.banner.findMany({ select: { image: true, videoUrl: true, videoPoster: true } })
  for (const b of banners) {
    if (b.image) {
      const m = b.image.match(/\/api\/uploads\/([^/?]+)/)
      if (m) refs.add(m[1])
    }
    if (b.videoUrl) {
      const m = b.videoUrl.match(/\/api\/uploads\/([^/?]+)/)
      if (m) refs.add(m[1])
    }
    if (b.videoPoster) {
      const m = b.videoPoster.match(/\/api\/uploads\/([^/?]+)/)
      if (m) refs.add(m[1])
    }
  }

  const dramas = await prisma.drama.findMany({ select: { coverImage: true } })
  for (const d of dramas) {
    if (d.coverImage) {
      // coverImage 可能是 /uploads/xxx 或 /api/uploads/xxx
      const m = d.coverImage.match(/\/(?:api\/)?uploads\/([^/?]+)/)
      if (m) refs.add(m[1])
    }
  }

  // SQLite 不直接支持 scheduleImage / galleryImages，用原始查询
  const rows = await prisma.$queryRawUnsafe<Array<{ scheduleImage: string | null; galleryImages: string | null }>>(
    `SELECT scheduleImage, galleryImages FROM Drama WHERE scheduleImage IS NOT NULL OR galleryImages IS NOT NULL`
  )
  for (const r of rows) {
    if (r.scheduleImage) {
      const m = r.scheduleImage.match(/\/(?:api\/)?uploads\/([^/?]+)/)
      if (m) refs.add(m[1])
    }
    if (r.galleryImages) {
      const files = r.galleryImages.split(',').filter(Boolean)
      for (const f of files) {
        const m = f.trim().match(/\/(?:api\/)?uploads\/([^/?]+)/)
        if (m) refs.add(m[1])
      }
    }
  }

  const settings = await prisma.siteSettings.findFirst({ select: { tipQRCode: true, publicAccountImg: true } })
  if (settings) {
    for (const url of [settings.tipQRCode, settings.publicAccountImg]) {
      if (url) {
        const m = url.match(/\/(?:api\/)?uploads\/([^/?]+)/)
        if (m) refs.add(m[1])
      }
    }
  }

  return refs
}

export async function POST() {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    const files = await readdir(uploadDir).catch(() => [] as string[])
    const refs = await getReferencedFiles()

    const orphaned = files.filter(f => !refs.has(f))
    let deleted = 0
    let freedBytes = 0

    for (const filename of orphaned) {
      try {
        const filePath = path.join(uploadDir, filename)
        const { size } = await import('fs/promises').then(m => m.stat(filePath)).catch(() => ({ size: 0 }))
        await unlink(filePath)
        freedBytes += size
        deleted++
      } catch {
        // 跳过无法删除的文件
      }
    }

    const freedMB = (freedBytes / 1024 / 1024).toFixed(1)

    return NextResponse.json({
      total: files.length,
      referenced: refs.size,
      orphaned: orphaned.length,
      deleted,
      freedMB: `${freedMB} MB`,
    })
  } catch (err) {
    console.error('Cleanup error:', err)
    return NextResponse.json({ error: '清理失败' }, { status: 500 })
  }
}
