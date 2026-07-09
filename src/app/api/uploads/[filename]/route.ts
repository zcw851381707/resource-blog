import { NextRequest, NextResponse } from 'next/server'
import { stat } from 'fs/promises'
import { createReadStream } from 'fs'
import path from 'path'

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.ogg': 'video/ogg',
}

const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.ogg'])
// 本地开发时，图不存在则从线上代理，不用手动同步
const PROXY_SOURCE = process.env.NODE_ENV === 'development' ? 'https://cgx851.com' : null

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params
  const safe = path.basename(filename)
  if (safe !== filename) return new NextResponse('Not Found', { status: 404 })

  try {
    const filePath = path.join(process.cwd(), 'public', 'uploads', safe)
    const fileStat = await stat(filePath)
    const fileSize = fileStat.size
    const ext = path.extname(safe).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    const isVideo = VIDEO_EXTS.has(ext)

    // Handle Range requests (required for video seeking)
    const rangeHeader = request.headers.get('range')
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      const stream = createReadStream(filePath, { start, end })
      return new NextResponse(stream as unknown as BodyInit, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': contentType,
          'Cache-Control': isVideo ? 'public, max-age=86400' : 'public, max-age=31536000, immutable',
        },
      })
    }

    // Full file response
    const stream = createReadStream(filePath)
    return new NextResponse(stream as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': isVideo ? 'public, max-age=86400' : 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    // 本地开发时自动从线上代理，不需手动同步图片
    if (PROXY_SOURCE) {
      try {
        const upstream = `${PROXY_SOURCE}/api/uploads/${safe}`
        const resp = await fetch(upstream)
        if (!resp.ok) return new NextResponse('Not Found', { status: 404 })
        const buffer = Buffer.from(await resp.arrayBuffer())
        const ext = path.extname(safe).toLowerCase()
        const contentType = MIME_TYPES[ext] || 'application/octet-stream'
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
          },
        })
      } catch {
        return new NextResponse('Not Found', { status: 404 })
      }
    }
    return new NextResponse('Not Found', { status: 404 })
  }
}
