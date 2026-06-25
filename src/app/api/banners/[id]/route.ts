import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { deleteUploadedFile } from '@/lib/upload'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json()
    const { dramaId, description, imagePosition, showButton, bannerLink, isPortrait, portraitImages, isAd, adLabel, image, mediaType, videoUrl, videoPoster, videoDuration, ...rest } = body

    // 获取旧记录，检查图片/视频是否被替换
    const old = await prisma.banner.findUnique({ where: { id }, select: { image: true, videoUrl: true, videoPoster: true } })
    const banner = await prisma.banner.update({
      where: { id },
      data: {
        ...rest,
        image: image !== undefined ? (image || null) : undefined,
        mediaType: mediaType !== undefined ? (mediaType || 'image') : undefined,
        videoUrl: videoUrl !== undefined ? (videoUrl || null) : undefined,
        videoPoster: videoPoster !== undefined ? (videoPoster || null) : undefined,
        videoDuration: videoDuration !== undefined ? (videoDuration || null) : undefined,
        dramaId: dramaId !== undefined ? (dramaId || null) : undefined,
        description: description !== undefined ? (description || null) : undefined,
        imagePosition: imagePosition !== undefined ? (imagePosition || 'center') : undefined,
        showButton: showButton !== undefined ? (showButton ?? false) : undefined,
        bannerLink: bannerLink !== undefined ? (bannerLink || null) : undefined,
        isPortrait: isPortrait !== undefined ? (isPortrait ?? false) : undefined,
        portraitImages: portraitImages !== undefined ? (portraitImages || null) : undefined,
        isAd: isAd !== undefined ? (isAd ?? false) : undefined,
        adLabel: isAd !== undefined ? (isAd ? (adLabel?.trim() || null) : null) : undefined,
      },
    })

    // 替换了图片 → 异步删除旧文件
    if (old?.image && image !== undefined && old.image !== image) {
      deleteUploadedFile(old.image)
    }
    // 替换了视频 → 异步删除旧视频和旧封面
    if (old?.videoUrl && videoUrl !== undefined && old.videoUrl !== videoUrl) {
      deleteUploadedFile(old.videoUrl)
      if (old.videoPoster) deleteUploadedFile(old.videoPoster)
    }

    return NextResponse.json(banner)
  } catch (err) {
    console.error('PUT /api/banners/[id] error:', err)
    return NextResponse.json({ error: '保存失败，请重试' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }
  const { id } = await params
  const banner = await prisma.banner.findUnique({ where: { id }, select: { image: true, videoUrl: true, videoPoster: true } })
  await prisma.banner.delete({ where: { id } })
  // 删除关联的上传图片
  if (banner?.image) {
    deleteUploadedFile(banner.image)
  }
  // 删除关联的视频和封面
  if (banner?.videoUrl) {
    deleteUploadedFile(banner.videoUrl)
    if (banner.videoPoster) deleteUploadedFile(banner.videoPoster)
  }
  return NextResponse.json({ success: true })
}
