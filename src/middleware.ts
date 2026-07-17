import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// 完全公开的路径
const FULLY_PUBLIC = ['/login', '/agreement', '/disclaimer', '/api/auth', '/api/captcha', '/api/visit', '/api/requests', '/api/announcements', '/api/uploads', '/api/analytics', '/_next', '/favicon', '/uploads']

// GET 公开的 API
const READ_PUBLIC_API = ['/api/drama', '/api/comments', '/api/banners', '/api/socials', '/api/favorites', '/api/following', '/api/subscriptions', '/api/notifications', '/api/ratings', '/api/search', '/api/link-report', '/api/settings', '/api/home', '/api/reports']

const STATIC_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.css', '.js', '.json', '.xml', '.txt', '.mp4', '.webm']

function isFullyPublic(path: string): boolean {
  return FULLY_PUBLIC.some(p => path.startsWith(p))
}

function isStaticFile(path: string): boolean {
  return STATIC_EXTS.some(ext => path.toLowerCase().endsWith(ext))
}

function isReadPublicApi(path: string, method: string): boolean {
  if (method !== 'GET') return false
  return READ_PUBLIC_API.some(p => path.startsWith(p))
}

function getSecret(): Uint8Array {
  const key = process.env.JWT_SECRET
  if (!key) return new TextEncoder().encode('dev-secret-local-only')
  return new TextEncoder().encode(key)
}

async function requireToken(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  if (!token) return null
  try {
    await jwtVerify(token, getSecret())
    return token
  } catch { return null }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // 静态文件 → 直接放行
  if (isStaticFile(path)) return NextResponse.next()

  // 完全公开路径
  if (isFullyPublic(path)) return NextResponse.next()

  // GET 公开的 API
  if (isReadPublicApi(path, request.method)) return NextResponse.next()

  // 其他 API → 需要 token
  if (path.startsWith('/api/')) {
    const token = await requireToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.next()
  }

  // 页面 → 需要 token，否则重定向
  const token = await requireToken(request)
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', path + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
