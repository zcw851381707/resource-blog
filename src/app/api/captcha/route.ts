import { NextResponse } from 'next/server'

// 简单的内存验证码存储（单服务器够用）
const captchaStore = new Map<string, { answer: number; expiresAt: number }>()
const TTL = 5 * 60 * 1000 // 5 分钟过期

// 定时清理过期验证码
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of captchaStore) {
    if (val.expiresAt < now) captchaStore.delete(key)
  }
}, 60_000)

export async function GET() {
  const token = crypto.randomUUID()
  const a = Math.floor(Math.random() * 10) + 1
  const b = Math.floor(Math.random() * 10) + 1
  const answer = a + b
  const question = `${a} + ${b} = ?`

  captchaStore.set(token, { answer, expiresAt: Date.now() + TTL })

  return NextResponse.json({ token, question })
}

export function verifyCaptcha(token: string, answer: string): boolean {
  const entry = captchaStore.get(token)
  if (!entry) return false
  if (entry.expiresAt < Date.now()) {
    captchaStore.delete(token)
    return false
  }
  captchaStore.delete(token) // 一次性使用
  return String(entry.answer) === answer.trim()
}
