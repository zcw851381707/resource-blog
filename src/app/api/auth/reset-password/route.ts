import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  let body: { email: string; code: string; newPassword: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: '请填写信息' }, { status: 400 })
  }

  const { email, code, newPassword } = body

  if (!email?.trim()) return NextResponse.json({ error: '请输入邮箱' }, { status: 400 })
  if (!code?.trim()) return NextResponse.json({ error: '请输入验证码' }, { status: 400 })
  if (!newPassword || newPassword.length < 6) return NextResponse.json({ error: '新密码至少 6 位' }, { status: 400 })

  // 校验验证码
  const record = await prisma.emailCode.findFirst({
    where: { email: email.trim(), code: code.trim(), purpose: 'reset', used: false },
    orderBy: { createdAt: 'desc' },
  })
  if (!record) return NextResponse.json({ error: '验证码错误' }, { status: 400 })
  if (new Date() > record.expiresAt) return NextResponse.json({ error: '验证码已过期，请重新发送' }, { status: 400 })

  // 查找用户
  const user = await prisma.user.findUnique({ where: { email: email.trim() } })
  if (!user) return NextResponse.json({ error: '该邮箱未注册' }, { status: 400 })

  // 更新密码
  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

  // 标记验证码已用
  await prisma.emailCode.update({ where: { id: record.id }, data: { used: true } })

  return NextResponse.json({ ok: true, message: '密码已重置，请重新登录' })
}
