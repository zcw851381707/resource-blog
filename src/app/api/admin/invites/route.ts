import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'BETA-'
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function GET() {
  try { await requireAuth() } catch { return NextResponse.json({ error: '未登录' }, { status: 401 }) }
  const list = await prisma.inviteCode.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(list)
}

export async function POST(request: NextRequest) {
  try { await requireAuth() } catch { return NextResponse.json({ error: '未登录' }, { status: 401 }) }
  const body = await request.json()
  const maxUses = Number(body.maxUses) || 1
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

  const code = genCode()
  const session = await requireAuth()
  const invite = await prisma.inviteCode.create({
    data: { code, createdBy: session.userId, maxUses, expiresAt },
  })
  return NextResponse.json(invite, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  try { await requireAuth() } catch { return NextResponse.json({ error: '未登录' }, { status: 401 }) }
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 ID' }, { status: 400 })
  await prisma.inviteCode.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
