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

// 公开列表：不暴露邮箱、链接等隐私信息，share/feedback 只显示 isPublic=true 的
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const admin = searchParams.get('admin') === '1'
  const where: Record<string, unknown> = {}
  if (type) where.type = type
  if (!admin) {
    // 非管理员只看公开的
    where.isPublic = true
    // share 不在综合列表中显示
    if (!type) {
      where.NOT = { type: 'share' }
    }
  }
  const requests = await prisma.resourceRequest.findMany({
    where,
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
      isPublic: true,
      createdAt: true,
    },
  })
  return NextResponse.json(requests)
}

// 创建请求 / 反馈 / 点赞 / 切换公开状态
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

  // 心愿去重：返回 duplicate 标志让前端弹窗确认
  if (body.type === 'request' && body.name?.trim() && !body.confirmDuplicate) {
    const existing = await prisma.resourceRequest.findFirst({
      where: { name: body.name.trim(), type: 'request' },
    })
    if (existing) {
      return NextResponse.json({
        duplicate: true,
        existingName: existing.name,
        existingLikes: existing.likes,
      }, { status: 409 })
    }
  }

  // 用户确认继续提交重复心愿 → 给已有的 +1 热度
  if (body.type === 'request' && body.name?.trim() && body.confirmDuplicate) {
    const existing = await prisma.resourceRequest.findFirst({
      where: { name: body.name.trim(), type: 'request' },
    })
    if (existing) {
      await prisma.resourceRequest.update({
        where: { id: existing.id },
        data: { likes: { increment: 1 } },
      })
      return NextResponse.json({ liked: true, confirmDuplicate: true })
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

  // 所有提交默认不公开，需要审核后才展示
  const isPublic = false

  const req = await prisma.resourceRequest.create({
    data: {
      name: body.name?.trim() || '',
      type: body.type || 'request',
      description: body.description?.trim() || null,
      email: body.email?.trim() || null,
      linkUrl: body.linkUrl?.trim() || null,
      linkExtractCode: body.linkExtractCode?.trim() || null,
      isPublic,
    },
  })
  return NextResponse.json({ ...req, remaining: DAILY_LIMIT - todayCount - 1 }, { status: 201 })
}

// 切换公开/不公开（管理员用）
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  if (body.action === 'togglePublic' && body.id) {
    const item = await prisma.resourceRequest.findUnique({ where: { id: body.id } })
    if (!item) return NextResponse.json({ error: '不存在' }, { status: 404 })
    const updated = await prisma.resourceRequest.update({
      where: { id: body.id },
      data: { isPublic: !item.isPublic },
    })
    return NextResponse.json(updated)
  }
  return NextResponse.json({ error: '未知操作' }, { status: 400 })
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
