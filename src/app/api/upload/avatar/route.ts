import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export async function POST(request: NextRequest) {
  let formData: FormData
  try { formData = await request.formData() } catch {
    return NextResponse.json({ error: '请上传图片' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: '请选择图片' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: '仅支持 JPG/PNG/GIF/WebP 格式' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: '头像不能超过 2MB' }, { status: 400 })

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/gif' ? 'gif' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const filename = `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadDir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(uploadDir, filename), buffer)

  return NextResponse.json({ url: `/uploads/${filename}` })
}
