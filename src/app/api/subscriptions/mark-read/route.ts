import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/subscriptions/mark-read — 将所有未读预约通知标记为已读
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

  await prisma.dramaSubscription.updateMany({
    where: { userId: session.userId, notified: false },
    data: { notified: true, notifiedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
