'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  content: string
  refId?: string | null
  isRead: boolean
  createdAt: string
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      setItems(data.items || [])
    } catch {/*ignore*/}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // 进入页面 = 自动全部已读
  useEffect(() => {
    // 等首次加载完成后再标记
    const timer = setTimeout(() => {
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).then(() => {
        setItems(prev => prev.map(n => ({ ...n, isRead: true })))
      }).catch(() => {})
    }, 600)  // 延迟一下让用户先看到哪些是未读的
    return () => clearTimeout(timer)
  }, [])  // 只在挂载时执行一次

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setItems(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  const markOne = async (id: string) => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) })
    setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  const unreadCount = items.filter(n => !n.isRead).length
  const filtered = filter === 'unread' ? items.filter(n => !n.isRead) : items

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)]">
            <svg className="w-5 h-5" fill={unreadCount > 0 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"/>
            </svg>
          </span>
          通知中心
        </h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="text-xs text-[var(--brand)] hover:underline">
            全部已读
          </button>
        )}
      </div>

      {/* Tab */}
      <div className="flex gap-1.5 mb-4">
        <button onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            filter === 'all' ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--brand-pale)]'
          }`}>
          全部 {items.length > 0 && <span className="ml-1 text-xs opacity-80">{items.length}</span>}
        </button>
        <button onClick={() => setFilter('unread')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            filter === 'unread' ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--brand-pale)]'
          }`}>
          未读 {unreadCount > 0 && <span className="ml-1 px-1.5 rounded bg-red-500 text-white text-[10px]">{unreadCount}</span>}
        </button>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="py-16 text-center text-[var(--text-muted)] text-sm">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-[var(--text-muted)] text-sm">
          {filter === 'unread' ? '✓ 没有未读通知' : '暂无通知'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <NotificationItem key={n.id} n={n} onRead={markOne} />
          ))}
        </div>
      )}
    </div>
  )
}

function NotificationItem({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const isMute = n.type === 'MUTE'
  return (
    <div
      onClick={() => !n.isRead && onRead(n.id)}
      className={`relative px-4 py-3 rounded-xl border transition-all cursor-pointer ${
        n.isRead
          ? 'bg-[var(--bg-card)] border-[var(--border)]'
          : isMute
            ? 'bg-orange-50 border-orange-200'
            : 'bg-[var(--brand-bg)] border-[var(--brand-pale)]'
      }`}>
      {!n.isRead && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500" />
      )}
      <div className="flex items-start gap-3">
        <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
          isMute ? 'bg-orange-500' : 'bg-[var(--brand)]'
        }`}>
          {isMute ? '!' : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{n.title}</p>
          <p className={`text-xs mt-0.5 leading-relaxed ${isMute ? 'text-orange-700' : 'text-[var(--text-secondary)]'}`}>{n.content}</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">{timeAgoStr(n.createdAt)}</p>
        </div>
      </div>
    </div>
  )
}

function timeAgoStr(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 天前`
  return `${Math.floor(day / 30)} 个月前`
}