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
    const { title, subtitle, highlightWord, image, mediaType, videoUrl, videoPoster, videoDuration, gradientFrom, gradientTo, buttonText, buttonLink, bannerLink, showButton, isPortrait, portraitImages, isAd, adLabel, titleFont, sortOrder, isActive, dramaId, description, imagePosition } = body
    if (!title && mediaType !== 'video') return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
    // sortOrder: 1=第一个, 2=第二个... 未指定则排到最后
    let finalSortOrder: number
    if (sortOrder && sortOrder > 0) {
      finalSortOrder = sortOrder
    } else {
      const max = await prisma.banner.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } })
      finalSortOrder = max ? max.sortOrder + 1 : 1
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
        isAd: isAd ?? false,
        adLabel: isAd ? (adLabel?.trim() || null) : null,
        titleFont: titleFont || null,
        sortOrder: finalSortOrder,
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
