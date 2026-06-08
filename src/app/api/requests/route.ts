import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCaptcha } from '@/app/api/captcha/route'

// 简单内存限流：每个 IP 每日最多 10 条
const rateLimitStore = new Map<string, { count: number; date: string }>()
const DAILY_LIMIT = 10

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || '127.0.0.1'
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

// 公开列表：不暴露邮箱、链接等隐私信息
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const requests = await prisma.resourceRequest.findMany({
    where: {
      ...(type ? { type } : {}),
      NOT: { type: 'share' },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      likes: true,
      reply: true,
      isProcessed: true,
      createdAt: true,
    },
  })
  return NextResponse.json(requests)
}

// 创建请求 / 反馈 / 点赞
export async function POST(request: NextRequest) {
  const body = await request.json()

  // 点赞 toggle
  if (body.action === 'like' && body.name?.trim()) {
    const existing = await prisma.resourceRequest.findFirst({
      where: { name: body.name.trim(), type: 'request' },
    })
    if (existing) {
      const delta = body.liked ? -1 : 1
      const updated = await prisma.resourceRequest.update({
        where: { id: existing.id },
        data: { likes: { increment: delta } },
      })
      return NextResponse.json({ id: updated.id, likes: updated.likes, liked: !body.liked })
    }
  }

  // 心愿去重
  if (body.type === 'request' && body.name?.trim()) {
    const existing = await prisma.resourceRequest.findFirst({
      where: { name: body.name.trim(), type: 'request' },
    })
    if (existing) {
      const updated = await prisma.resourceRequest.update({
        where: { id: existing.id },
        data: { likes: { increment: 1 } },
      })
      return NextResponse.json({ id: updated.id, liked: true })
    }
  }

  // 限流检查
  const ip = getClientIp(request)
  const today = getTodayKey()
  const rateEntry = rateLimitStore.get(ip)
  const todayCount = rateEntry && rateEntry.date === today ? rateEntry.count : 0

  if (todayCount >= DAILY_LIMIT) {
    return NextResponse.json({
      error: '提交次数过多，请明日再试',
      rateLimited: true,
    }, { status: 429 })
  }

  // 验证验证码
  if (!body.captchaToken || !body.captchaAnswer) {
    return NextResponse.json({ error: '请完成验证码' }, { status: 400 })
  }
  if (!verifyCaptcha(body.captchaToken, body.captchaAnswer)) {
    return NextResponse.json({ error: '验证码错误' }, { status: 400 })
  }

  // 更新计数
  if (!rateEntry || rateEntry.date !== today) {
    rateLimitStore.set(ip, { count: 1, date: today })
  } else {
    rateEntry.count++
  }

  const req = await prisma.resourceRequest.create({
    data: {
      name: body.name?.trim() || '',
      type: body.type || 'request',
      description: body.description?.trim() || null,
      email: body.email?.trim() || null,
      linkUrl: body.linkUrl?.trim() || null,
      linkExtractCode: body.linkExtractCode?.trim() || null,
    },
  })
  return NextResponse.json({ ...req, remaining: DAILY_LIMIT - todayCount - 1 }, { status: 201 })
}

// 查询今日剩余次数
export async function PUT(request: NextRequest) {
  const ip = getClientIp(request)
  const today = getTodayKey()
  const entry = rateLimitStore.get(ip)
  const count = entry && entry.date === today ? entry.count : 0
  return NextResponse.json({
    count,
    limit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - count),
  })
}
