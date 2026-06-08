import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    await prisma.visitLog.create({
      data: {
        path: body.path || '/',
        ip: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    })
  } catch {
    // 静默失败，不影响页面加载
  }
  return NextResponse.json({ ok: true })
}
