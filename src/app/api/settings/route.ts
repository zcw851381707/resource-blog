import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const settings = await prisma.siteSettings.findFirst()
  if (!settings) return NextResponse.json(null)

  // 用原始 SQL 读取 larkWebhookUrl（绕过 Prisma client 未重新生成的问题）
  const rows = await prisma.$queryRawUnsafe<Array<{ larkWebhookUrl: string | null }>>(
    `SELECT larkWebhookUrl FROM SiteSettings WHERE id = ?`, settings.id
  )
  return NextResponse.json({ ...settings, larkWebhookUrl: rows[0]?.larkWebhookUrl || null })
}

export async function PUT(request: NextRequest) {
  await requireAuth()
  const body = await request.json()
  const { larkWebhookUrl, ...rest } = body
  const existing = await prisma.siteSettings.findFirst()

  let settings
  if (existing) {
    settings = await prisma.siteSettings.update({ where: { id: existing.id }, data: rest })
  } else {
    settings = await prisma.siteSettings.create({ data: rest })
  }

  // 用原始 SQL 写入 larkWebhookUrl（绕过 Prisma client 未重新生成的问题）
  if (larkWebhookUrl !== undefined) {
    await prisma.$executeRawUnsafe(
      `UPDATE SiteSettings SET larkWebhookUrl = ? WHERE id = ?`, larkWebhookUrl || null, settings.id
    )
  }

  return NextResponse.json({ ...settings, larkWebhookUrl: larkWebhookUrl || null })
}
