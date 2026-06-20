import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// POST /api/admin/notifications/broadcast
// body: { title: string, content: string }
// 给所有活跃用户写一条 ANNOUNCEMENT 类型的通知
export async function POST(request: NextRequest) {
  try { await requireAuth() } catch { return NextResponse.json({ error: '未登录' }, { status: 401 }) }

  const { title, content } = await request.json()
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 })
  }

  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: { id: true },
  })

  if (users.length === 0) {
    return NextResponse.json({ ok: true, count: 0 })
  }

  const result = await prisma.notification.createMany({
    data: users.map(u => ({
      userId: u.id,
      type: 'ANNOUNCEMENT',
      title: title.trim().slice(0, 60),
      content: content.trim().slice(0, 200),
    })),
  })

  return NextResponse.json({ ok: true, count: result.count })
}
