import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params
  const body = await request.json()
  const banner = await prisma.banner.update({ where: { id }, data: body })
  return NextResponse.json(banner)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params
  await prisma.banner.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
