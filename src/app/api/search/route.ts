import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || ''
  const hot = request.nextUrl.searchParams.get('hot')

  // 热门推荐
  if (hot !== null) {
    const results = await prisma.$queryRawUnsafe<Array<{ id: string; title: string; slug: string; coverImage: string | null; region: string | null; imagePosition: string | null; seriesGroup: string | null; seriesOrder: number | null }>>(
      `SELECT id, title, slug, coverImage, region, imagePosition, seriesGroup, seriesOrder FROM Drama ORDER BY clickCount DESC LIMIT 10`
    )
    return NextResponse.json(results)
  }

  if (!q.trim()) {
    return NextResponse.json([])
  }

  const chars = q.trim().split('')
  // 先逐字匹配，再连续匹配，提高模糊搜索的覆盖率
  const conditions = chars.map(() => `title LIKE ?`)
  const params = chars.map(c => `%${c}%`)

  const results = await prisma.$queryRawUnsafe<Array<{ id: string; title: string; slug: string; coverImage: string | null; region: string | null; imagePosition: string | null; seriesGroup: string | null; seriesOrder: number | null }>>(
    `SELECT id, title, slug, coverImage, region, imagePosition, seriesGroup, seriesOrder FROM Drama WHERE ${conditions.join(' AND ')} OR title LIKE ? OR originalTitle LIKE ? ORDER BY
       CASE WHEN title LIKE ? THEN 0 WHEN originalTitle LIKE ? THEN 1 ELSE 2 END,
       clickCount DESC
     LIMIT 20`,
    ...params, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`
  )

  return NextResponse.json(results)
}
