import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const socials = await prisma.socialLink.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json(socials)
}

export async function POST(request: NextRequest) {
  await requireAuth()
  const body = await request.json()
  const social = await prisma.socialLink.create({ data: body })
  return NextResponse.json(social, { status: 201 })
}
