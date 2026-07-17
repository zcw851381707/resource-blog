import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// GET /api/achievements — 当前用户的成就列表（已解锁 + 未解锁）
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const allAchievements = await prisma.achievement.findMany({ orderBy: { createdAt: 'asc' } })
  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId: session.userId },
    select: { achievementId: true, unlockedAt: true },
  })
  const unlockedMap = new Map(userAchievements.map(ua => [ua.achievementId, ua.unlockedAt]))

  const list = allAchievements.map(a => ({
    ...a,
    unlocked: unlockedMap.has(a.id),
    unlockedAt: unlockedMap.get(a.id)?.toISOString() || null,
  }))

  return NextResponse.json({ items: list, total: list.length, unlocked: userAchievements.length })
}
