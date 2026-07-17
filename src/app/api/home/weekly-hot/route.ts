import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/home/weekly-hot
// 热播追剧榜 TOP 10（按 Drama.clickCount 详情页打开次数排序）
// 显示：每日上午 10:00 更新一次
export async function GET() {
  try {
    // 查 Drama 表（按 clickCount 倒序）
    const dramas = await prisma.drama.findMany({
      where: {
        OR: [
          { isOnSchedule: true },
          { isNewlyAired: true },
          { isCompleted: true },
        ],
      },
      orderBy: { clickCount: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        clickCount: true,
      },
    })

    if (dramas.length === 0) {
      return NextResponse.json({ items: [], maxClick: 1, updateTime: '每日 10:00 更新' })
    }

    // 查每部剧的追剧人数和收藏数（用独立 count 查询）
    const dramaIds = dramas.map(d => d.id)
    const [followingCounts, favoriteCounts] = await Promise.all([
      prisma.userFollowing.groupBy({
        by: ['dramaId'],
        where: { dramaId: { in: dramaIds } },
        _count: { dramaId: true },
      }),
      prisma.userFavorite.groupBy({
        by: ['dramaId'],
        where: { dramaId: { in: dramaIds } },
        _count: { dramaId: true },
      }),
    ])

    const followMap: Record<string, number> = {}
    followingCounts.forEach(g => { followMap[g.dramaId] = g._count.dramaId })

    const favMap: Record<string, number> = {}
    favoriteCounts.forEach(g => { favMap[g.dramaId] = g._count.dramaId })

    // 计算最大热度（用于进度条归一化）
    const maxClick = Math.max(...dramas.map(d => d.clickCount || 0), 1)

    const items = dramas.map((d, idx) => ({
      rank: idx + 1,
      id: d.id,
      title: d.title,
      slug: d.slug,
      coverImage: d.coverImage,
      clickCount: d.clickCount || 0,
      totalFollowings: followMap[d.id] || 0,
      totalFavorites: favMap[d.id] || 0,
    }))

    return NextResponse.json({
      items,
      maxClick,
      updateTime: '每日 10:00 更新',
    })
  } catch (err) {
    console.error('GET /api/home/weekly-hot error:', err)
    return NextResponse.json({ items: [], maxClick: 1, updateTime: '每日 10:00 更新' })
  }
}