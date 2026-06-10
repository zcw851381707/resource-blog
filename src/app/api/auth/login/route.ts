import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createToken } from '@/lib/auth'
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/rate-limit'

function getClientIP(request: NextRequest): string {
  // 优先取反向代理/CDN 传过来的真实 IP
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP
  return '127.0.0.1'
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)

  // 频率限制检查
  const limit = checkRateLimit(ip)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `登录尝试过于频繁，请 ${Math.ceil(limit.retryAfter! / 60)} 分钟后再试` },
      { status: 429 },
    )
  }

  const body = await request.json()
  const { username, password } = body

  if (!username || !password) {
    return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    const fail = recordFailedAttempt(ip)
    return NextResponse.json({
      error: fail.locked
        ? `登录尝试过于频繁，请 ${Math.ceil(fail.retryAfter! / 60)} 分钟后再试`
        : `用户名或密码错误（还剩 ${fail.remaining} 次尝试）`,
    }, { status: fail.locked ? 429 : 401 })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    const fail = recordFailedAttempt(ip)
    return NextResponse.json({
      error: fail.locked
        ? `登录尝试过于频繁，请 ${Math.ceil(fail.retryAfter! / 60)} 分钟后再试`
        : `用户名或密码错误（还剩 ${fail.remaining} 次尝试）`,
    }, { status: fail.locked ? 429 : 401 })
  }

  // 登录成功，清除失败记录
  clearAttempts(ip)

  const token = await createToken({ username: user.username })

  const response = NextResponse.json({ success: true })
  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 1 day
    path: '/',
  })

  return response
}
