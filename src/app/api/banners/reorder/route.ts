import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// POST /api/banners/reorder
// Body: { id: string, direction: 'up' | 'down' }
// 服务端原子交换 sortOrder，不会脏数据
export async function POST(request: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  try {
    const { id, direction } = await request.json()
    if (!id || !direction) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    const current = await prisma.banner.findUnique({ where: { id }, select: { sortOrder: true } })
    if (!current) {
      return NextResponse.json({ error: 'Banner 不存在' }, { status: 404 })
    }

    // 找邻居
    const neighbor = await prisma.banner.findFirst({
      where: {
        id: { not: id },
        sortOrder: direction === 'up'
          ? { lt: current.sortOrder }
          : { gt: current.sortOrder },
      },
      orderBy: { sortOrder: direction === 'up' ? 'desc' : 'asc' },
      select: { id: true, sortOrder: true },
    })

    if (!neighbor) {
      return NextResponse.json({ error: '已是第一个/最后一个，无法移动' }, { status: 400 })
    }

    // 原子交换：用事务确保两条同时成功
    const [a, b] = direction === 'up' ? [current, neighbor] : [neighbor, current]
    // a 上移（sortOrder 变小）→ a 取 b 的值，b 取 a 的值
    await prisma.$transaction([
      prisma.banner.update({ where: { id }, data: { sortOrder: neighbor.sortOrder } }),
      prisma.banner.update({ where: { id: neighbor.id }, data: { sortOrder: current.sortOrder } }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/banners/reorder error:', err)
    return NextResponse.json({ error: '排序失败，请重试' }, { status: 500 })
  }
}
