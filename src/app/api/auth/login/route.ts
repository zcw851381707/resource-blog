import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createToken } from '@/lib/auth'
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/rate-limit'

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP
  return '127.0.0.1'
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)

  const limit = checkRateLimit(ip)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `登录尝试过于频繁，请 ${Math.ceil(limit.retryAfter! / 60)} 分钟后再试` },
      { status: 429 },
    )
  }

  const body = await request.json()
  const { email, username, password } = body

  if (!password) {
    return NextResponse.json({ error: '请输入密码' }, { status: 400 })
  }

  let user = null
  if (email) {
    user = await prisma.user.findUnique({ where: { email } })
  } else if (username) {
    user = await prisma.user.findUnique({ where: { username } })
  } else {
    return NextResponse.json({ error: '请输入邮箱或用户名' }, { status: 400 })
  }

  if (!user) {
    const fail = recordFailedAttempt(ip)
    return NextResponse.json({
      error: fail.locked
        ? `登录尝试过于频繁，请 ${Math.ceil(fail.retryAfter! / 60)} 分钟后再试`
        : `账号或密码错误（还剩 ${fail.remaining} 次尝试）`,
    }, { status: fail.locked ? 429 : 401 })
  }

  if (user.status === 'banned') {
    return NextResponse.json({ error: '账号已被封禁' }, { status: 403 })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    const fail = recordFailedAttempt(ip)
    return NextResponse.json({
      error: fail.locked
        ? `登录尝试过于频繁，请 ${Math.ceil(fail.retryAfter! / 60)} 分钟后再试`
        : `账号或密码错误（还剩 ${fail.remaining} 次尝试）`,
    }, { status: fail.locked ? 429 : 401 })
  }

  clearAttempts(ip)

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

  const token = await createToken({ userId: user.id, username: user.username, role: user.role })

  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt?.toISOString?.() ?? user.createdAt,
      profileChangedAt: user.profileChangedAt?.toISOString?.() ?? user.profileChangedAt,
      mutedUntil: user.mutedUntil?.toISOString?.() ?? user.mutedUntil,
      mutedReason: user.mutedReason,
    },
  })

  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: false,
    maxAge: 60 * 60 * 24 * 10,
    path: '/',
  })

  return response
}
