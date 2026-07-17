'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Item {
  id: string
  title: string
  slug: string
  coverImage: string | null
  imagePosition: string | null
  totalEpisodes: number | null
}

export default function WeekCompleted() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/home/week-completed')
      .then(r => r.json())
      .then(data => { if (!cancelled) setItems(data.items || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return null
  if (items.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-center gap-2 mb-4">
        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 12.5l2.5 2.5 4.5-5" />
        </svg>
        <h2 className="text-xl font-extrabold text-[var(--text-primary)]">本周完结</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hidden">
        {items.map(item => (
          <Link
            key={item.id}
            href={`/drama/${item.slug}`}
            className="shrink-0 w-[140px] group"
          >
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[var(--bg-secondary)] shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200">
              {item.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.coverImage}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: item.imagePosition || 'center' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)]">暂无封面</div>
              )}
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-500/90 text-white text-[10px] font-bold shadow-sm">
                完结
              </div>
            </div>
            <p className="mt-2 text-xs font-medium text-[var(--text-primary)] line-clamp-2 leading-relaxed group-hover:text-[var(--brand)] transition-colors">
              {item.title}
            </p>
            {item.totalEpisodes && (
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">共 {item.totalEpisodes} 集</p>
            )}
          </Link>
        ))}
      </div>

      <div className="flex justify-center mt-5">
        <Link
          href="/all?filter=completed"
          className="px-10 py-2.5 rounded-full border-2 border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--brand)] hover:border-[var(--brand)] transition-all duration-200 flex items-center gap-1.5"
        >
          查看更多
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </section>
  )
}
