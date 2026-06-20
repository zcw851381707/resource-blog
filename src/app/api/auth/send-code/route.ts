import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendVerificationCode } from '@/lib/email'

const CODE_EXPIRE_MINUTES = 15

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return '127.0.0.1'
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  let body: { email: string; purpose: 'register' | 'reset' }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: '请提供邮箱' }, { status: 400 })
  }

  const { email, purpose } = body
  if (!email || !purpose) return NextResponse.json({ error: '请提供邮箱和用途' }, { status: 400 })
  if (!['register', 'reset'].includes(purpose)) return NextResponse.json({ error: '无效的用途' }, { status: 400 })

  // 频率限制
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // 同一邮箱今天发送次数
  const emailCount = await prisma.emailCode.count({
    where: { email, purpose, createdAt: { gte: todayStart } },
  })
  if (emailCount >= 5) {
    return NextResponse.json({ error: '该邮箱今日验证码发送次数已达上限（5次），请明天再试' }, { status: 429 })
  }

  // 同一 IP 今天发送次数（不限邮箱）
  const ipCount = await prisma.emailCode.count({
    where: { ip, purpose, createdAt: { gte: todayStart } },
  })
  if (ipCount >= 20) {
    return NextResponse.json({ error: '该 IP 今日验证码发送次数已达上限（20次），请明天再试' }, { status: 429 })
  }

  // 60 秒冷却
  const lastCode = await prisma.emailCode.findFirst({
    where: { email, purpose },
    orderBy: { createdAt: 'desc' },
  })
  if (lastCode) {
    const since = now.getTime() - lastCode.createdAt.getTime()
    if (since < 60_000) {
      return NextResponse.json({ error: `请 ${60 - Math.ceil(since / 1000)} 秒后再试` }, { status: 429 })
    }
  }

  // 生成 6 位验证码（字母+数字，排除易混淆字符 0/O/1/I/L）
  const CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)]
  const expiresAt = new Date(now.getTime() + CODE_EXPIRE_MINUTES * 60_000)

  // 存数据库
  await prisma.emailCode.create({
    data: { email, code, purpose, expiresAt, ip },
  })

  // 发送邮件
  try {
    await sendVerificationCode(email, code, purpose)
  } catch (e) {
    console.error('发送邮件失败:', e)
    return NextResponse.json({ error: '邮件发送失败，请稍后再试' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: `验证码已发送至 ${email}，${CODE_EXPIRE_MINUTES} 分钟内有效` })
}
