import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/achievements/check — 检查并解锁新成就
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const newUnlocks: Array<{ code: string; name: string; icon: string }> = []
  const allAchievements = await prisma.achievement.findMany()
  const userAchSet = new Set(
    (await prisma.userAchievement.findMany({
      where: { userId: session.userId },
      select: { achievementId: true },
    })).map(ua => ua.achievementId)
  )

  const [followingCount, favCount, commentCount, completedCount, requestCount, reportCount, pinnedCount] = await Promise.all([
    prisma.userFollowing.count({ where: { userId: session.userId } }),
    prisma.userFavorite.count({ where: { userId: session.userId } }),
    prisma.comment.count({ where: { userId: session.userId, isDeleted: false } }),
    prisma.userFollowing.count({ where: { userId: session.userId, status: 'completed' } }),
    prisma.resourceRequest.count({ where: { userId: session.userId } }),
    prisma.linkReport.count({ where: { ip: session.userId } }),
    prisma.comment.count({ where: { userId: session.userId, pinned: true } }),
  ])

  for (const ach of allAchievements) {
    if (userAchSet.has(ach.id)) continue
    let shouldUnlock = false
    let cond: Record<string, unknown> = {}
    try { cond = JSON.parse(ach.condition) } catch { cond = {} }
    const count = (cond as any).count || 1

    switch (ach.code) {
      case 'FIRST_FOLLOW':
        shouldUnlock = followingCount >= count
        break
      case 'WEEK_FINISH':
        if (completedCount > 0) {
          const recent = await prisma.userFollowing.findFirst({
            where: { userId: session.userId, status: 'completed' },
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true },
          })
          if (recent) {
            const diff = (Date.now() - recent.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
            shouldUnlock = diff <= 7
          }
        }
        break
      case 'STREAK_7':
      case 'STREAK_30': {
        const records = await prisma.userFollowing.findMany({
          where: { userId: session.userId, status: { not: 'dropped' } },
          select: { updatedAt: true },
          orderBy: { updatedAt: 'desc' },
        })
        if (records.length > 0) {
          let streak = 1
          for (let i = 1; i < records.length; i++) {
            const diff = (records[i - 1].updatedAt.getTime() - records[i].updatedAt.getTime()) / (1000 * 60 * 60 * 24)
            if (diff <= 2) streak++
            else break
          }
          shouldUnlock = streak >= count
        }
        break
      }
      case 'DAILY_3': {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayUpdates = await prisma.userFollowing.findMany({
          where: { userId: session.userId, updatedAt: { gte: todayStart } },
          select: { progress: true },
        })
        const totalTodayEp = todayUpdates.reduce((sum, r) => sum + r.progress, 0)
        shouldUnlock = totalTodayEp >= count
        break
      }
      case 'COMMENT_10':
        shouldUnlock = commentCount >= count
        break
      case 'COLLECTOR_30':
        shouldUnlock = favCount >= count
        break
      case 'POLYGLOT_5': {
        const watchingCount = await prisma.userFollowing.count({
          where: { userId: session.userId, status: 'watching' },
        })
        shouldUnlock = watchingCount >= count
        break
      }
      case 'FIRST_COMMENT':
        shouldUnlock = commentCount >= count
        break
      case 'NIGHT_OWL': {
        const nightVisits = await prisma.visitLog.count({ where: { ip: session.userId } })
        if (nightVisits > 0) shouldUnlock = true
        break
      }
      case 'LINK_REPORTER':
        shouldUnlock = reportCount >= count
        break
      case 'WISHLISTER':
        shouldUnlock = requestCount >= count
        break
      case 'VETERAN': {
        const userRecord = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { createdAt: true },
        })
        if (userRecord) {
          const daysSinceReg = (Date.now() - userRecord.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          shouldUnlock = daysSinceReg >= count
        }
        break
      }
      case 'PICKED_3':
        shouldUnlock = pinnedCount >= count
        break
    }

    if (shouldUnlock) {
      await prisma.userAchievement.create({
        data: { userId: session.userId, achievementId: ach.id },
      })
      newUnlocks.push({ code: ach.code, name: ach.name, icon: ach.icon })
    }
  }

  return NextResponse.json({
    newUnlocks,
    total: newUnlocks.length,
    message: newUnlocks.length > 0
      ? `解锁了 ${newUnlocks.length} 个成就: ${newUnlocks.map(u => u.icon + u.name).join(' ')}`
      : undefined,
  })
}
