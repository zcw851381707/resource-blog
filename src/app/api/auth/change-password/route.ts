import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const body = await request.json()
  const { oldPassword, newPassword } = body

  if (!oldPassword) return NextResponse.json({ error: '请输入旧密码' }, { status: 400 })
  if (!newPassword || newPassword.length < 6) return NextResponse.json({ error: '新密码至少 6 位' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

  const valid = await bcrypt.compare(oldPassword, user.password)
  if (!valid) return NextResponse.json({ error: '旧密码错误' }, { status: 400 })

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: session.userId }, data: { password: hashed } })

  return NextResponse.json({ ok: true })
}
