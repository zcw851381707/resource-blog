'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import HorizontalSlider from '@/components/HorizontalSlider'

interface Item {
  id: string
  title: string
  slug: string
  coverImage: string | null
  imagePosition: string | null
  currentEpisode: number | null
  totalEpisodes: number | null
}

export default function TodayUpdates() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/home/today-updates')
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
        <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v4M16 3v4" />
          <circle cx="12" cy="15" r="1.5" fill="currentColor" />
        </svg>
        <h2 className="text-xl font-extrabold text-[var(--text-primary)]">今日更新</h2>
      </div>

      <HorizontalSlider>
        {items.map(item => (
          <Link
            key={item.id}
            href={`/drama/${item.slug}`}
            className="group block w-[150px] md:w-[170px] lg:w-[190px]"
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
              {/* 剧名 - 底部叠加 */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-6 pb-2 px-2.5">
                <p className="text-[13px] font-bold text-white line-clamp-2 leading-tight drop-shadow">
                  {item.title}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </HorizontalSlider>
    </section>
  )
}
