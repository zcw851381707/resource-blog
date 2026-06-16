import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { unlink } from 'fs/promises'
import path from 'path'

// 公开：获取单篇文章（按 slug）
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const article = await prisma.article.findFirst({
    where: { OR: [{ slug: id }, { id }] },
  })
  if (!article) return NextResponse.json({ error: '文章不存在' }, { status: 404 })
  if (!article.isPublished) {
    try { await requireAuth() } catch {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 })
    }
  }
  return NextResponse.json(article)
}

// 公开：点赞；管理员：快速操作（下线/置顶）
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { action } = await request.json()

  // 点赞：公开操作，无需登录
  if (action === 'like') {
    await prisma.article.update({
      where: { id },
      data: { likes: { increment: 1 } },
    })
    return NextResponse.json({ success: true })
  }

  // 以下操作需要管理员权限
  try { await requireAuth() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (action === 'unpublish') {
    await prisma.article.update({ where: { id }, data: { isPublished: false } })
    return NextResponse.json({ success: true })
  }
  if (action === 'pin') {
    await prisma.article.update({ where: { id }, data: { pinned: true } })
    return NextResponse.json({ success: true })
  }
  if (action === 'unpin') {
    await prisma.article.update({ where: { id }, data: { pinned: false } })
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ error: '未知操作' }, { status: 400 })
}

// 管理员：更新文章
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await request.json()
  const { title, slug, content, coverImage, excerpt, dramaTitle, wechatUrl, isPublished, imagePosition } = body

  // 图片本地化处理：下载外部图片到本地，替换 src
  let processedContent = content
  if (content) {
    processedContent = await localizeImages(content)
  }

  // 检测被删除的图片并清理
  const oldArticle = await prisma.article.findUnique({ where: { id } })
  if (oldArticle?.content) {
    await cleanupRemovedImages(oldArticle.content, processedContent)
  }

  const article = await prisma.article.update({
    where: { id },
    data: {
      title, slug,
      content: processedContent,
      coverImage: coverImage || null,
      excerpt: excerpt || null,
      dramaTitle: dramaTitle || null,
      wechatUrl: wechatUrl || null,
      isPublished: isPublished ?? false,
      publishedAt: isPublished ? (oldArticle?.publishedAt || new Date()) : null,
      imagePosition: imagePosition || 'center',
    },
  })
  return NextResponse.json(article)
}

// 管理员：删除文章（同时清理图片）
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const article = await prisma.article.findUnique({ where: { id } })
  if (article?.content) {
    await deleteArticleImages(article.content)
  }
  if (article?.coverImage) {
    await deleteFile(article.coverImage)
  }
  await prisma.article.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

// 下载文章中的外链图片，替换为本地路径
async function localizeImages(html: string): Promise<string> {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  const matches = [...html.matchAll(imgRegex)]
  let result = html

  for (const match of matches) {
    const src = match[1]
    if (!src) continue
    // 跳过已是本地的图片
    if (src.startsWith('/uploads/') || src.includes('localhost') || src.includes('127.0.0.1')) continue

    try {
      const localPath = await downloadImage(src)
      if (localPath) {
        result = result.replace(src, localPath)
      }
    } catch { /* 下载失败保持原链接 */ }
  }
  return result
}

async function downloadImage(url: string): Promise<string | null> {
  const resp = await fetch(url, {
    headers: { Referer: 'https://mp.weixin.qq.com/', 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(15000),
  })
  if (!resp.ok) return null
  const buffer = Buffer.from(await resp.arrayBuffer())
  const ext = getExt(resp.headers.get('content-type') || '')
  const filename = `article_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
  const filepath = path.join(process.cwd(), 'public', 'uploads', 'articles', filename)

  const { mkdir, writeFile } = await import('fs/promises')
  await mkdir(path.dirname(filepath), { recursive: true })
  await writeFile(filepath, buffer)
  return `/uploads/articles/${filename}`
}

function getExt(contentType: string): string {
  if (contentType.includes('png')) return '.png'
  if (contentType.includes('gif')) return '.gif'
  if (contentType.includes('webp')) return '.webp'
  if (contentType.includes('svg')) return '.svg'
  return '.jpg'
}

// 清理文章中被删除的本地图片
async function cleanupRemovedImages(oldHtml: string, newHtml: string) {
  const getLocalImgs = (html: string) => {
    const re = /<img[^>]+src=["'](\/uploads\/articles\/[^"']+)["'][^>]*>/gi
    return new Set([...html.matchAll(re)].map(m => m[1]))
  }
  const oldImgs = getLocalImgs(oldHtml)
  const newImgs = getLocalImgs(newHtml)
  for (const img of oldImgs) {
    if (!newImgs.has(img)) await deleteFile(img)
  }
}

async function deleteArticleImages(html: string) {
  const re = /<img[^>]+src=["'](\/uploads\/articles\/[^"']+)["'][^>]*>/gi
  for (const match of html.matchAll(re)) {
    await deleteFile(match[1])
  }
}

async function deleteFile(filepath: string) {
  if (!filepath.startsWith('/uploads/')) return
  const full = path.join(process.cwd(), 'public', filepath)
  try { await unlink(full) } catch {}
}
