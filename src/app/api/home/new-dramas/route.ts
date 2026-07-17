import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/home/new-dramas
// 返回近 30 天内创建的新剧
export async function GET() {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dramas = await prisma.drama.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        imagePosition: true,
        region: true,
        tags: true,
        totalEpisodes: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ items: dramas })
  } catch (err) {
    console.error('GET /api/home/new-dramas error:', err)
    return NextResponse.json({ items: [] })
  }
}