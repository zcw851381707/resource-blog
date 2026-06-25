import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/comments/[id]/pin — 管理员精选置顶/取消置顶
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: '只有管理员可以操作' }, { status: 403 })

  const { id } = await params
  const comment = await prisma.comment.findUnique({ where: { id } })
  if (!comment) return NextResponse.json({ error: '评论不存在' }, { status: 404 })

  const updated = await prisma.comment.update({
    where: { id },
    data: { pinned: !comment.pinned },
  })

  return NextResponse.json({ ok: true, pinned: updated.pinned })
}