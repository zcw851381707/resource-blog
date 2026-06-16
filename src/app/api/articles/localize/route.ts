import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import path from 'path'
import { mkdir, writeFile } from 'fs/promises'

export async function POST(request: NextRequest) {
  try { await requireAuth() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { html } = await request.json()
  if (!html) return NextResponse.json({ error: '缺少内容' }, { status: 400 })
  const localized = await localizeImages(html)
  return NextResponse.json({ html: localized })
}

async function localizeImages(html: string): Promise<string> {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  const matches = [...html.matchAll(imgRegex)]
  let result = html
  for (const match of matches) {
    const src = match[1]
    if (!src || src.startsWith('/uploads/') || src.startsWith('data:')) continue
    try {
      const local = await downloadImage(src)
      if (local) result = result.replace(src, local)
    } catch { /* skip */ }
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
  const ct = resp.headers.get('content-type') || ''
  const ext = ct.includes('png') ? '.png' : ct.includes('gif') ? '.gif' : ct.includes('webp') ? '.webp' : ct.includes('svg') ? '.svg' : '.jpg'
  const filename = `article_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
  const dir = path.join(process.cwd(), 'public', 'uploads', 'articles')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), buffer)
  return `/uploads/articles/${filename}`
}
