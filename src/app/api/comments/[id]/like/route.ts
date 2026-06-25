import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/comments/[id]/like — 点赞/取消点赞
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { id: commentId } = await params
  const comment = await prisma.comment.findUnique({ where: { id: commentId } })
  if (!comment || comment.isDeleted) return NextResponse.json({ error: '评论不存在' }, { status: 404 })

  // 查找是否已点赞
  const existing = await prisma.commentLike.findUnique({
    where: { userId_commentId: { userId: session.userId, commentId } },
  })

  let liked: boolean
  if (existing) {
    // 取消点赞
    await prisma.commentLike.delete({ where: { id: existing.id } })
    await prisma.comment.update({
      where: { id: commentId },
      data: { likeCount: { decrement: 1 } },
    })
    liked = false
  } else {
    await prisma.commentLike.create({
      data: { userId: session.userId, commentId },
    })
    await prisma.comment.update({
      where: { id: commentId },
      data: { likeCount: { increment: 1 } },
    })
    liked = true
  }

  const updated = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { likeCount: true },
  })

  return NextResponse.json({ ok: true, liked, likeCount: updated?.likeCount || 0 })
}

// GET /api/comments/[id]/like — 检查是否已点赞
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  const { id: commentId } = await params
  if (!session) return NextResponse.json({ liked: false })
  const existing = await prisma.commentLike.findUnique({
    where: { userId_commentId: { userId: session.userId, commentId } },
  })
  return NextResponse.json({ liked: !!existing })
}