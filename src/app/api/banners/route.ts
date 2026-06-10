import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const banners = await prisma.banner.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] })
  return NextResponse.json(banners)
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { title, subtitle, highlightWord, image, mediaType, videoUrl, videoPoster, videoDuration, gradientFrom, gradientTo, buttonText, buttonLink, bannerLink, showButton, isPortrait, portraitImages, sortOrder, isActive, dramaId, description, imagePosition } = body
    if (!title) return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
    // 新 banner 默认排到最前面
    if (sortOrder === undefined || sortOrder === 0) {
      const min = await prisma.banner.findFirst({ orderBy: { sortOrder: 'asc' }, select: { sortOrder: true } })
      const newSort = min ? min.sortOrder - 1 : 0
      const banner = await prisma.banner.create({
        data: {
          title, subtitle, highlightWord, image,
          mediaType: mediaType || 'image',
          videoUrl: videoUrl || null,
          videoPoster: videoPoster || null,
          videoDuration: videoDuration || null,
          gradientFrom: gradientFrom || '#D47060',
          gradientTo: gradientTo || '#E89080',
          buttonText: buttonText || null,
          buttonLink: buttonLink || null,
          bannerLink: bannerLink || null,
          showButton: showButton ?? false,
          isPortrait: isPortrait ?? false,
          portraitImages: portraitImages || null,
          sortOrder: newSort,
          isActive: isActive ?? true,
          dramaId: dramaId || null,
          description: description || null,
          imagePosition: imagePosition || 'center',
        },
      })
      return NextResponse.json(banner, { status: 201 })
    }
    const banner = await prisma.banner.create({
      data: {
        title, subtitle, highlightWord, image,
        mediaType: mediaType || 'image',
        videoUrl: videoUrl || null,
        videoPoster: videoPoster || null,
        videoDuration: videoDuration || null,
        gradientFrom: gradientFrom || '#D47060',
        gradientTo: gradientTo || '#E89080',
        buttonText: buttonText || null,
        buttonLink: buttonLink || null,
        bannerLink: bannerLink || null,
        showButton: showButton ?? false,
        isPortrait: isPortrait ?? false,
        portraitImages: portraitImages || null,
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
        dramaId: dramaId || null,
        description: description || null,
        imagePosition: imagePosition || 'center',
      },
    })
    return NextResponse.json(banner, { status: 201 })
  } catch (err) {
    console.error('POST /api/banners error:', err)
    return NextResponse.json({ error: '保存失败，请重试' }, { status: 500 })
  }
}
