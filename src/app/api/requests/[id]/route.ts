import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params
  const body = await request.json()
  const data: Record<string, unknown> = {}
  if (body.isProcessed !== undefined) data.isProcessed = body.isProcessed
  if (body.reply !== undefined) data.reply = body.reply?.trim() || null
  const req = await prisma.resourceRequest.update({ where: { id }, data })
  return NextResponse.json(req)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params
  await prisma.resourceRequest.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
