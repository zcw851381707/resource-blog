import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function isProtected(req: NextRequest): boolean {
  const path = req.nextUrl.pathname
  const method = req.method

  // 所有写操作都需鉴权
  if (method !== 'GET') {
    // POST /api/requests 公开（用户提交求资源）
    if (path === '/api/requests' && method === 'POST') return false
    // POST /api/visit 公开（访问统计）
    if (path === '/api/visit') return false
    // POST /api/auth/* 公开
    if (path.startsWith('/api/auth')) return false
    return true
  }

  // GET 请求：仅以下路径需鉴权
  // /api/requests：POST 公开，GET 也公开（前端许愿列表用），管理后台通过 /api/requests/[id] 鉴权
  if (path.startsWith('/api/stats')) return true
  if (path.startsWith('/api/settings')) return true

  return false
}

export function middleware(request: NextRequest) {
  if (!isProtected(request)) return NextResponse.next()

  const token = request.cookies.get('auth_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
