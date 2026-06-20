import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/comments/[id] — 软删除（自己或管理员可删）
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { id } = await params
  const comment = await prisma.comment.findUnique({ where: { id } })
  if (!comment) return NextResponse.json({ error: '评论不存在' }, { status: 404 })
  if (comment.userId !== session.userId && session.role !== 'admin') {
    return NextResponse.json({ error: '只能删除自己的评论' }, { status: 403 })
  }

  await prisma.comment.update({ where: { id }, data: { isDeleted: true } })

  return NextResponse.json({ ok: true })
}
