/**
 * 简易登录频率限制（内存版）
 * 同一 IP 连续失败 5 次 → 锁定 15 分钟
 * 成功登录后自动清除失败记录
 */

interface Attempt {
  count: number
  firstFail: number
  lockedUntil: number
}

const store = new Map<string, Attempt>()

// 每 10 分钟清理一次过期记录，防止内存泄漏
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of store) {
    if (now > val.lockedUntil + 3600_000) {
      store.delete(key)
    }
  }
}, 600_000)

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000 // 15 分钟

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry) {
    return { allowed: true, remaining: MAX_ATTEMPTS }
  }

  // 锁定期内
  if (entry.lockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.lockedUntil - now) / 1000),
    }
  }

  // 锁定期已过，重置
  if (now - entry.firstFail > LOCKOUT_MS) {
    store.delete(ip)
    return { allowed: true, remaining: MAX_ATTEMPTS }
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count }
}

export function recordFailedAttempt(ip: string): { remaining: number; locked: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry) {
    store.set(ip, { count: 1, firstFail: now, lockedUntil: 0 })
    return { remaining: MAX_ATTEMPTS - 1, locked: false }
  }

  // 重置过期记录
  if (now - entry.firstFail > LOCKOUT_MS) {
    store.set(ip, { count: 1, firstFail: now, lockedUntil: 0 })
    return { remaining: MAX_ATTEMPTS - 1, locked: false }
  }

  entry.count += 1
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS
    return {
      remaining: 0,
      locked: true,
      retryAfter: Math.ceil(LOCKOUT_MS / 1000),
    }
  }

  return { remaining: MAX_ATTEMPTS - entry.count, locked: false }
}

export function clearAttempts(ip: string): void {
  store.delete(ip)
}
