import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const banners = await prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json(banners)
}

export async function POST(request: NextRequest) {
  await requireAuth()
  const body = await request.json()
  const { title, subtitle, highlightWord, image, gradientFrom, gradientTo, buttonText, buttonLink, sortOrder, isActive } = body
  const banner = await prisma.banner.create({
    data: {
      title, subtitle, highlightWord, image,
      gradientFrom: gradientFrom || '#D47060',
      gradientTo: gradientTo || '#E89080',
      buttonText, buttonLink,
      sortOrder: sortOrder ?? 0,
      isActive: isActive ?? true,
    },
  })
  return NextResponse.json(banner, { status: 201 })
}
