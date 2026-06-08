import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params
  // 防止路径穿越
  const safe = path.basename(filename)
  if (safe !== filename) return new NextResponse('Not Found', { status: 404 })

  try {
    const filePath = path.join(process.cwd(), 'public', 'uploads', safe)
    const buf = await readFile(filePath)

    const ext = path.extname(safe).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    }
    const contentType = mimeTypes[ext] || 'application/octet-stream'

    return new NextResponse(buf, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('Not Found', { status: 404 })
  }
}
