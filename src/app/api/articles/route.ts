import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const admin = searchParams.get('admin') === '1'
  const take = admin ? 20 : 10

  try {
    if (admin) await requireAuth()
    const where = admin ? {} : { isPublished: true }
    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
        skip: (page - 1) * take,
        take,
      }),
      prisma.article.count({ where }),
    ])
    return NextResponse.json({ articles, total, page, totalPages: Math.ceil(total / take) })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: '获取文章失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try { await requireAuth() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json()
  const { title, slug, content, coverImage, excerpt, dramaTitle, wechatUrl, isPublished, imagePosition } = body
  if (!title || !slug || !content) {
    return NextResponse.json({ error: '标题、slug 和内容为必填项' }, { status: 400 })
  }
  const article = await prisma.article.create({
    data: {
      title, slug, content,
      coverImage: coverImage || null,
      excerpt: excerpt || null,
      dramaTitle: dramaTitle || null,
      wechatUrl: wechatUrl || null,
      isPublished: isPublished ?? false,
      publishedAt: isPublished ? new Date() : null,
      imagePosition: imagePosition || 'center',
    },
  })
  return NextResponse.json(article, { status: 201 })
}
