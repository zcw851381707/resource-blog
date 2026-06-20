import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/banned-words
export async function GET() {
  try { await requireAuth() } catch { return NextResponse.json({ error: '未登录' }, { status: 401 }) }

  const words = await prisma.bannedWord.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(words)
}

// POST /api/admin/banned-words → { word }
// DELETE /api/admin/banned-words?id=xxx
export async function POST(request: NextRequest) {
  try { await requireAuth() } catch { return NextResponse.json({ error: '未登录' }, { status: 401 }) }

  const { word } = await request.json()
  if (!word || word.trim().length === 0) {
    return NextResponse.json({ error: '词条不能为空' }, { status: 400 })
  }

  // 去重
  const existing = await prisma.bannedWord.findUnique({ where: { word: word.trim() } })
  if (existing) return NextResponse.json({ error: '该词条已存在' }, { status: 400 })

  const item = await prisma.bannedWord.create({ data: { word: word.trim() } })
  return NextResponse.json({ ok: true, id: item.id, word: item.word })
}

export async function DELETE(request: NextRequest) {
  try { await requireAuth() } catch { return NextResponse.json({ error: '未登录' }, { status: 401 }) }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  await prisma.bannedWord.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
