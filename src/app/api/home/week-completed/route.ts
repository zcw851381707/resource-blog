import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/home/week-completed
// 返回本周完结的剧（isCompleted + completedAt 在本周）
export async function GET() {
  try {
    const now = new Date()
    // 本周一开始
    const weekStart = new Date(now)
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1 // 周一=0
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(weekStart.getDate() - dayOfWeek)

    const dramas = await prisma.drama.findMany({
      where: {
        isCompleted: true,
        completedAt: { gte: weekStart },
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        imagePosition: true,
        totalEpisodes: true,
        region: true,
        tags: true,
      },
    })

    return NextResponse.json({ items: dramas })
  } catch (err) {
    console.error('GET /api/home/week-completed error:', err)
    return NextResponse.json({ items: [] })
  }
}