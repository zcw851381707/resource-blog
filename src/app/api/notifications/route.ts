import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET：当前用户的通知列表 + 未读数
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ items: [], unreadCount: 0 })

  try {
    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.notification.count({
        where: { userId: session.userId, isRead: false },
      }),
    ])
    return NextResponse.json({ items, unreadCount })
  } catch {
    return NextResponse.json({ items: [], unreadCount: 0 })
  }
}

// PATCH：标记为已读
// body: { ids?: string[] } 传 ids 标指定几条；不传 ids 标全部已读
export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  try {
    if (Array.isArray(body.ids) && body.ids.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: body.ids }, userId: session.userId },
        data: { isRead: true },
      })
    } else {
      await prisma.notification.updateMany({
        where: { userId: session.userId, isRead: false },
        data: { isRead: true },
      })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}
