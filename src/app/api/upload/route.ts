import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  await requireAuth()
  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const ext = file.name.split('.').pop() || 'png'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')

  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), Buffer.from(bytes))

  return NextResponse.json({ url: `/api/uploads/${filename}` })
}
