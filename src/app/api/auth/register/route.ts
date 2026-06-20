import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  let body: {
    username: string; email: string; code: string; password: string
    inviteCode: string; avatar?: string
  }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: '请填写注册信息' }, { status: 400 })
  }

  const { username, email, code, password, inviteCode, avatar } = body

  // 校验必填
  if (!username?.trim()) return NextResponse.json({ error: '请输入用户名' }, { status: 400 })
  if (!email?.trim()) return NextResponse.json({ error: '请输入邮箱' }, { status: 400 })
  if (!code?.trim()) return NextResponse.json({ error: '请输入验证码' }, { status: 400 })
  if (!password || password.length < 6) return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 })
  if (!inviteCode?.trim()) return NextResponse.json({ error: '请输入邀请码' }, { status: 400 })

  // 用户名格式：16字内，汉字/数字/英文/符号
  const name = username.trim()
  if (name.length > 16) return NextResponse.json({ error: '用户名不能超过 16 个字符' }, { status: 400 })

  // 校验验证码
  const record = await prisma.emailCode.findFirst({
    where: { email: email.trim(), code: code.trim(), purpose: 'register', used: false },
    orderBy: { createdAt: 'desc' },
  })
  if (!record) return NextResponse.json({ error: '验证码错误' }, { status: 400 })
  if (new Date() > record.expiresAt) return NextResponse.json({ error: '验证码已过期，请重新发送' }, { status: 400 })

  // 校验邀请码
  const invite = await prisma.inviteCode.findUnique({ where: { code: inviteCode.trim() } })
  if (!invite) return NextResponse.json({ error: '邀请码无效' }, { status: 400 })
  if (invite.usedCount >= invite.maxUses) return NextResponse.json({ error: '邀请码已被用完' }, { status: 400 })
  if (invite.expiresAt && new Date() > invite.expiresAt) return NextResponse.json({ error: '邀请码已过期' }, { status: 400 })

  // 检查重复
  const existingEmail = await prisma.user.findUnique({ where: { email: email.trim() } })
  if (existingEmail) return NextResponse.json({ error: '该邮箱已注册' }, { status: 400 })
  const existingName = await prisma.user.findUnique({ where: { username: name } })
  if (existingName) return NextResponse.json({ error: '该用户名已被使用' }, { status: 400 })

  // 创建用户
  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      username: name,
      email: email.trim(),
      password: hashed,
      avatar: avatar || null,
      role: 'user',
      lastLoginAt: new Date(),
    },
  })

  // 标记验证码已用 + 邀请码计数 +1
  await prisma.emailCode.update({ where: { id: record.id }, data: { used: true } })
  await prisma.inviteCode.update({ where: { id: invite.id }, data: { usedCount: invite.usedCount + 1 } })

  // 登录
  const token = await createToken({ userId: user.id, username: user.username, role: user.role })
  const res = NextResponse.json({ ok: true, user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, role: user.role } })
  res.cookies.set('auth_token', token, { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 })
  return res
}
