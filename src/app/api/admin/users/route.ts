import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try { await requireAuth() } catch { return NextResponse.json({ error: '未登录' }, { status: 401 }) }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const status = searchParams.get('status') || ''
  const role = searchParams.get('role') || ''

  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [
      { username: { contains: q } },
      { email: { contains: q } },
    ]
  }
  if (status) where.status = status
  if (role) where.role = role

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { id: true, username: true, email: true, avatar: true, role: true, status: true, mutedUntil: true, lastLoginAt: true, createdAt: true },
  })
  return NextResponse.json(users)
}

export async function PATCH(request: NextRequest) {
  try { await requireAuth() } catch { return NextResponse.json({ error: '未登录' }, { status: 401 }) }

  const body = await request.json()
  const { id, action } = body
  if (!id) return NextResponse.json({ error: '缺少用户 ID' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

  switch (action) {
    case 'ban':
      if (user.role === 'admin') return NextResponse.json({ error: '不能封禁管理员' }, { status: 400 })
      await prisma.user.update({ where: { id }, data: { status: 'banned' } })
      return NextResponse.json({ ok: true })
    case 'unban':
      await prisma.user.update({ where: { id }, data: { status: 'active' } })
      return NextResponse.json({ ok: true })
    case 'setAdmin':
      await prisma.user.update({ where: { id }, data: { role: 'admin' } })
      return NextResponse.json({ ok: true })
    case 'removeAdmin':
      if (user.role !== 'admin') return NextResponse.json({ error: '该用户不是管理员' }, { status: 400 })
      await prisma.user.update({ where: { id }, data: { role: 'user' } })
      return NextResponse.json({ ok: true })
    case 'mute': {
      // body.duration: '1d' | '3d' | '7d' | 'forever'
      // body.reason: string
      const duration = body.duration || '3d'
      let mutedUntil: Date | null = null
      let label = ''
      if (duration === 'forever') {
        mutedUntil = new Date('2099-12-31')
        label = '永久禁言'
      } else {
        const days = parseInt(duration) || 3
        mutedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
        label = `禁言 ${days} 天`
      }
      const mutedReason = body.reason || `${label}：请规范留言，如有再犯将加大处罚`
      await prisma.user.update({ where: { id }, data: { mutedUntil, mutedReason } })

      // 给被禁言用户写一条通知
      await prisma.notification.create({
        data: {
          userId: id,
          type: 'MUTE',
          title: `⚠️ 你的评论功能已被${label}`,
          content: mutedReason,
          refId: id,
        },
      })

      return NextResponse.json({ ok: true, mutedUntil: mutedUntil.toISOString() })
    }
    case 'unmute':
      await prisma.user.update({ where: { id }, data: { mutedUntil: null, mutedReason: null } })
      return NextResponse.json({ ok: true })
    default:
      return NextResponse.json({ error: '未知操作' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try { await requireAuth() } catch { return NextResponse.json({ error: '未登录' }, { status: 401 }) }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少用户 ID' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  if (user.role === 'admin') return NextResponse.json({ error: '不能删除管理员' }, { status: 400 })

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
