import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const todayRanks = await prisma.dailyRanking.findMany({
    where: { date: today },
    orderBy: { rank: 'asc' },
    take: 10,
    select: { dramaId: true, rank: true },
  })
  if (todayRanks.length === 0) return NextResponse.json({ tags: {} })

  const dramaIds = todayRanks.map(r => r.dramaId)
  const history = await prisma.dailyRanking.findMany({
    where: { dramaId: { in: dramaIds }, isTop10: true },
    orderBy: { date: 'desc' },
  })

  const tags: Record<string, string[]> = {}

  for (const r of todayRanks) {
    const t: string[] = []
    const h = history.filter(x => x.dramaId === r.dramaId && x.date <= today)

    if (r.rank === 1) {
      const d = streak(h, today, 1)
      if (d >= 1) t.push('蝉联榜首 ' + d + ' 天')
    }
    if (r.rank === 2 || r.rank === 3) {
      const d = streakRange(h, today, 1, 3)
      if (d >= 1) t.push('稳居前三 ' + d + ' 天')
    }
    const beforeThisWeek = h.filter(x => x.date < weekAgo).length === 0
    const enteredThisWeek = h.some(x => x.date >= weekAgo && x.date < today)
    if (enteredThisWeek && beforeThisWeek) t.push('本周黑马')

    if (t.length > 0) tags[r.dramaId] = t
  }

  return NextResponse.json({ tags })
}

function streak(h: Array<{ date: string; rank: number }>, today: string, rank: number) {
  const e = h.filter(x => x.rank === rank && x.date <= today).sort((a, b) => b.date.localeCompare(a.date))
  let c = 0
  for (const x of e) {
    const d = new Date(today); d.setDate(d.getDate() - c)
    if (x.date === d.toISOString().split('T')[0]) c++
    else break
  }
  return c
}

function streakRange(h: Array<{ date: string; rank: number }>, today: string, min: number, max: number) {
  const e = h.filter(x => x.rank >= min && x.rank <= max && x.date <= today).sort((a, b) => b.date.localeCompare(a.date))
  let c = 0
  for (const x of e) {
    const d = new Date(today); d.setDate(d.getDate() - c)
    if (x.date === d.toISOString().split('T')[0]) c++
    else break
  }
  return c
}
