import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { username, password } = body

  if (!username || !password) {
    return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
  }

  const token = await createToken({ username: user.username })

  const response = NextResponse.json({ success: true })
  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return response
}
