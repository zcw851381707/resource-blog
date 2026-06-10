import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

let _secret: Uint8Array | null = null

function getSecret(): Uint8Array {
  if (_secret) return _secret
  const key = process.env.JWT_SECRET
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET 环境变量未设置！上线前必须配置。')
    }
    _secret = new TextEncoder().encode('dev-secret-local-only')
    return _secret
  }
  if (key.length < 32) {
    throw new Error('JWT_SECRET 太短，至少需要 32 个字符')
  }
  _secret = new TextEncoder().encode(key)
  return _secret
}

const secret = getSecret()

export async function createToken(payload: { username: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as { username: string }
  } catch {
    return null
  }
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}
