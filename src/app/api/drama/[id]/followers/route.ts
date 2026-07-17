import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/drama/[id]/followers
// 返回该剧的追剧用户列表（前 20 个 + 总数）
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // 总数
    const total = await prisma.userFollowing.count({ where: { dramaId: id } })

    // 前 20 个追剧用户（按更新时间倒序，最近追剧的人在前面）
    const follows = await prisma.userFollowing.findMany({
      where: { dramaId: id },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        // 关联用户信息（通过 userId 关联 User 表）
      },
    })

    // 单独查用户信息（避免 schema 关联缺失）
    const userIds = follows.map(f => f.userId)
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, avatar: true },
        })
      : []

    const userMap: Record<string, { id: string; username: string; avatar: string | null }> = {}
    users.forEach(u => { userMap[u.id] = u })

    const result = follows
      .filter(f => userMap[f.userId])
      .map(f => ({
        id: f.userId,
        username: userMap[f.userId].username,
        avatar: userMap[f.userId].avatar,
        status: f.status,
        progress: f.progress,
        updatedAt: f.updatedAt.toISOString(),
      }))

    return NextResponse.json({ total, users: result })
  } catch (err) {
    console.error('GET /api/drama/[id]/followers error:', err)
    return NextResponse.json({ error: '查询失败' }, { status: 500 })
  }
}