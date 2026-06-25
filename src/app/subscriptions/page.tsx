'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

export default function SubscriptionsPage() {
  const [items, setItems] = useState<Array<{ id: string; dramaId: string; createdAt: string }>>([])
  const [dramas, setDramas] = useState<Record<string, {
    title: string; originalTitle?: string | null; slug: string; coverImage?: string | null; imagePosition?: string | null;
    expectedDate?: string | null; expectedPrecision?: string | null;
  }>>({})
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/subscriptions')
      const data = await res.json()
      setItems(data.items || [])
      setDramas(data.dramas || {})
      setCounts(data.counts || {})
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const remove = async (dramaId: string) => {
    await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dramaId }),
    })
    setItems(prev => prev.filter(i => i.dramaId !== dramaId))
  }

  function getUpcomingText(dateStr?: string | null, precision?: string | null) {
    if (!dateStr) return '即将上线'
    const d = new Date(dateStr)
    if (precision === 'year') return `${d.getFullYear()}年开播`
    if (precision === 'month') return `${d.getMonth() + 1}月开播`
    return `${d.getMonth() + 1}月${d.getDate()}日开播`
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">我的预约</h1>
        <span className="text-sm text-[var(--text-muted)]">共 {items.length} 部</span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-[var(--text-muted)]">加载中...</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[var(--warning-bg)] flex items-center justify-center text-[var(--warning)]">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-1">还没有预约任何剧</p>
          <p className="text-xs text-[var(--text-muted)] mb-4">在即将上线的剧集详情页点"预约上线"，开播时通知你</p>
          <Link href="/schedule" className="text-sm text-[var(--brand)] hover:underline">去排期页看看 →</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const d = dramas[item.dramaId]
            if (!d) return null
            const c = counts[item.dramaId] || 0
            return (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:shadow-sm transition-all group">
                <Link href={`/drama/${d.slug}`} className="shrink-0">
                  <div className="relative w-12 h-16 rounded-md overflow-hidden bg-gradient-to-br from-orange-200 to-orange-400">
                    {d.coverImage && <img src={d.coverImage} alt={d.title} className="w-full h-full object-cover" style={{ objectPosition: d.imagePosition || 'center' }} />}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/drama/${d.slug}`} className="block text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors">
                    {d.title || d.originalTitle}
                  </Link>
                  <p className="text-[11px] text-[var(--warning)] mt-0.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>{getUpcomingText(d.expectedDate, d.expectedPrecision)}</span>
                    <span className="text-[var(--text-muted)]">·</span>
                    <span className="text-[var(--text-muted)]">{c} 人预约</span>
                  </p>
                </div>
                <button
                  onClick={() => remove(item.dramaId)}
                  className="shrink-0 px-2.5 py-1 rounded-md text-[11px] text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] transition-colors"
                >
                  取消预约
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
