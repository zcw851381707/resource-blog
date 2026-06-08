import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params
  const body = await request.json()
  const social = await prisma.socialLink.update({ where: { id }, data: body })
  return NextResponse.json(social)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params
  await prisma.socialLink.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
