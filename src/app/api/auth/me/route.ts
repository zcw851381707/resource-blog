import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

function getSecret(): Uint8Array {
  const key = process.env.JWT_SECRET
  if (!key) return new TextEncoder().encode('dev-secret-local-only')
  return new TextEncoder().encode(key)
}

const CHANGE_COOLDOWN_DAYS = 180

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  if (!token) return NextResponse.json({ user: null })

  let session: { userId: string; username: string; role?: string } | null = null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    session = { userId: payload.userId as string, username: payload.username as string, role: payload.role as string }
  } catch {
    return NextResponse.json({ user: null })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true, email: true, avatar: true, role: true, createdAt: true, profileChangedAt: true, mutedUntil: true, mutedReason: true },
    })
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ user: null })
  }
}

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 })

  let session: { userId: string } | null = null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    session = { userId: payload.userId as string }
  } catch {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const body = await request.json()
  const data: Record<string, string> = {}
  if (body.username?.trim() && body.username.length <= 16) data.username = body.username.trim()
  if (body.avatar) data.avatar = body.avatar
  if (Object.keys(data).length === 0) return NextResponse.json({ error: '无可更新的字段' }, { status: 400 })

  try {
    const current = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { username: true, avatar: true, profileChangedAt: true },
    })
    if (!current) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    const usernameChanged = data.username && data.username !== current.username
    const avatarChanged = data.avatar && data.avatar !== current.avatar
    if (!usernameChanged && !avatarChanged) return NextResponse.json({ error: '没有变化' }, { status: 400 })

    if (current.profileChangedAt) {
      const next = new Date(current.profileChangedAt)
      next.setDate(next.getDate() + CHANGE_COOLDOWN_DAYS)
      if (Date.now() < next.getTime()) {
        const daysLeft = Math.ceil((next.getTime() - Date.now()) / 86400000)
        return NextResponse.json({ error: `距离下次可修改还有 ${daysLeft} 天`, nextAvailableAt: next.toISOString(), daysLeft }, { status: 429 })
      }
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { ...data, profileChangedAt: new Date() },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('Unique constraint')) return NextResponse.json({ error: '用户名已被使用' }, { status: 400 })
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}
