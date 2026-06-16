import { NextRequest, NextResponse } from 'next/server'
import { createWriteStream } from 'fs'
import { mkdir } from 'fs/promises'
import path from 'path'
import { requireAuth } from '@/lib/auth'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const TIMEOUT_MS = 15000

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  let body: { url: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }

  const { url } = body
  if (!url) {
    return NextResponse.json({ error: '缺少 url 参数' }, { status: 400 })
  }

  try {
    // 服务端下载图片
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ImageFetcher/1.0)' },
    })
    clearTimeout(timer)

    if (!res.ok) {
      return NextResponse.json({ error: `下载失败: HTTP ${res.status}` }, { status: 400 })
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) {
      // 有些 CDN 不返回正确的 content-type，尝试从 URL 推断
      const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
      if (!ext || !['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
        return NextResponse.json({ error: `不是图片: ${contentType}` }, { status: 400 })
      }
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length === 0) {
      return NextResponse.json({ error: '下载内容为空' }, { status: 400 })
    }
    if (buffer.length > MAX_SIZE) {
      return NextResponse.json({ error: `图片过大: ${(buffer.length / 1024 / 1024).toFixed(1)}MB` }, { status: 400 })
    }

    // 确定扩展名
    let ext = url.split('?')[0].split('.').pop()?.toLowerCase()
    if (!ext || !['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      // 从 content-type 推断
      if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg'
      else if (contentType.includes('png')) ext = 'png'
      else if (contentType.includes('gif')) ext = 'gif'
      else if (contentType.includes('webp')) ext = 'webp'
      else if (contentType.includes('svg')) ext = 'svg'
      else ext = 'jpg'
    }
    if (ext === 'jpeg') ext = 'jpg'

    const filename = `drag_${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, filename)

    await new Promise<void>((resolve, reject) => {
      const ws = createWriteStream(filePath)
      ws.on('finish', () => resolve())
      ws.on('error', reject)
      ws.write(buffer)
      ws.end()
    })

    return NextResponse.json({ url: `/api/uploads/${filename}`, size: buffer.length }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: '下载超时' }, { status: 400 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    console.error('POST /api/upload/from-url error:', msg)
    return NextResponse.json({ error: `上传失败: ${msg}` }, { status: 500 })
  }
}
