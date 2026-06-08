import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(announcements)
}

export async function POST(request: NextRequest) {
  await requireAuth()
  const body = await request.json()
  const announcement = await prisma.announcement.create({ data: body })
  return NextResponse.json(announcement, { status: 201 })
}
