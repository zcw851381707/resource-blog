import { NextRequest, NextResponse } from 'next/server'
import { createWriteStream } from 'fs'
import { mkdir } from 'fs/promises'
import path from 'path'
import { requireAuth } from '@/lib/auth'
import Busboy from 'busboy'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024   // 10MB
const MAX_VIDEO_SIZE = 300 * 1024 * 1024  // 300MB
const MAX_VIDEO_DURATION = 180            // 3 minutes
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  try {
    const contentType = request.headers.get('content-type') || ''

    // 先拿到完整 body（图片 < 10MB，视频 < 300MB），再交给 busboy 解析
    const buffer = Buffer.from(await request.arrayBuffer())

    const result = await new Promise<{
      url: string; mediaType: string; size: number; duration?: number
    }>((resolve, reject) => {
      const bb = Busboy({ headers: { 'content-type': contentType } })

      let mediaType = 'image'
      let clientDuration = 0
      let fileData: Buffer | null = null
      let fileName = ''
      let mimeType = ''
      let resolved = false

      bb.on('field', (name: string, val: string) => {
        if (name === 'mediaType') mediaType = val
        if (name === 'duration') clientDuration = parseFloat(val) || 0
      })

      bb.on('file', (name: string, stream, info: { filename: string; mimeType: string }) => {
        fileName = info.filename
        mimeType = info.mimeType || info.filename.split('.').pop() || ''
        const chunks: Buffer[] = []
        stream.on('data', (chunk: Buffer) => { chunks.push(chunk) })
        stream.on('end', () => { fileData = Buffer.concat(chunks) })
        stream.on('error', (err: Error) => { reject(err) })
      })

      bb.on('close', async () => {
        if (resolved) return
        if (!fileData || fileData.length === 0) {
          reject(new Error('未收到文件数据'))
          return
        }

        // Validate MIME type
        if (mediaType === 'video') {
          if (!ALLOWED_VIDEO_TYPES.some(t => mimeType.includes(t.replace('video/', '')))) {
            reject(new Error('不支持的视频格式，请上传 mp4、webm 或 mov'))
            return
          }
          if (fileData.length > MAX_VIDEO_SIZE) {
            reject(new Error(`视频不能超过 ${MAX_VIDEO_SIZE / 1024 / 1024}MB`))
            return
          }
          if (clientDuration > MAX_VIDEO_DURATION) {
            reject(new Error('视频不能超过 3 分钟'))
            return
          }
        } else {
          if (!ALLOWED_IMAGE_TYPES.some(t => mimeType.includes(t.replace('image/', '')))) {
            reject(new Error('不支持的图片格式'))
            return
          }
          if (fileData.length > MAX_IMAGE_SIZE) {
            reject(new Error(`图片不能超过 ${MAX_IMAGE_SIZE / 1024 / 1024}MB`))
            return
          }
        }

        const ext = fileName.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'png')
        const prefix = mediaType === 'video' ? 'video_' : ''
        const filename = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const uploadDir = path.join(process.cwd(), 'public', 'uploads')

        await mkdir(uploadDir, { recursive: true })
        const filePath = path.join(uploadDir, filename)

        await new Promise<void>((res, rej) => {
          const ws = createWriteStream(filePath)
          ws.on('finish', () => res())
          ws.on('error', rej)
          ws.write(fileData)
          ws.end()
        })

        resolved = true
        const response: Record<string, unknown> = {
          url: `/api/uploads/${filename}`,
          mediaType,
          size: fileData.length,
        }
        if (mediaType === 'video' && clientDuration > 0) {
          response.duration = clientDuration
        }
        resolve(response as { url: string; mediaType: string; size: number })
      })

      bb.on('error', (err: Error) => {
        if (!resolved) reject(err)
      })

      // 手动喂数据给 busboy
      bb.end(buffer)
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('POST /api/upload error:', msg)
    return NextResponse.json({ error: `上传失败: ${msg}` }, { status: 500 })
  }
}
