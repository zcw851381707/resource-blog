import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { verifyCaptcha } from '@/app/api/captcha/route'

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function GET() {
  const reports = await prisma.linkReport.findMany({
    orderBy: { createdAt: 'desc' },
    include: { drama: { select: { title: true, slug: true } } },
    take: 100,
  })
  const linkIds = [...new Set(reports.map(r => r.linkId))]
  const links = await prisma.downloadLink.findMany({
    where: { id: { in: linkIds } },
    select: { id: true, url: true, extractCode: true },
  })
  const linkMap = new Map(links.map(l => [l.id, l]))
  return NextResponse.json(reports.map(r => ({
    ...r,
    link: linkMap.get(r.linkId) || null,
  })))
}

export async function POST(request: Request) {
  const { dramaId, linkId, linkPlatform, issueType, note, email, captchaToken, captchaAnswer } = await request.json()

  if (!dramaId || !linkId) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }

  // 验证验证码
  if (!captchaToken || !captchaAnswer || !verifyCaptcha(captchaToken, captchaAnswer)) {
    return NextResponse.json({ error: '验证码错误' }, { status: 400 })
  }

  // 每日限额：同一 IP 对同一个链接一天只能提交一次
  const ip = getClientIp(request)
  if (ip !== 'unknown') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const existing = await prisma.linkReport.findFirst({
      where: {
        linkId,
        createdAt: { gte: today },
      },
    })
    // 用原始 SQL 查 ip（因为 ip 列是后期加的）
    if (existing) {
      const rows = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
        `SELECT COUNT(*) as cnt FROM LinkReport WHERE linkId = ? AND ip = ? AND createdAt >= ?`,
        linkId, ip, today.toISOString()
      )
      if (rows[0].cnt > 0) {
        return NextResponse.json({ error: '您今天已提交过该链接的反馈，请明天再试' }, { status: 429 })
      }
    }
  }

  try {
    const report = await prisma.linkReport.create({
      data: {
        dramaId,
        linkId,
        linkPlatform: linkPlatform || '',
        issueType: issueType || '链接失效',
        note: note || null,
        email: email || null,
      },
    })
    // 用原始 SQL 保存 IP（ip 列是后期加的，绕过 Prisma）
    await prisma.$executeRawUnsafe(
      `UPDATE LinkReport SET ip = ? WHERE id = ?`,
      ip, report.id
    )
    return NextResponse.json({ ok: true, id: report.id })
  } catch {
    return NextResponse.json({ error: '提交失败' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const { id, isProcessed } = await request.json()
  if (!id) return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  await prisma.linkReport.update({ where: { id }, data: { isProcessed: !!isProcessed } })
  return NextResponse.json({ ok: true })
}

export async function PUT(request: Request) {
  const { linkId, url, extractCode } = await request.json()
  if (!linkId || !url) return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  await prisma.downloadLink.update({
    where: { id: linkId },
    data: { url, extractCode: extractCode || null },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  await prisma.linkReport.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
