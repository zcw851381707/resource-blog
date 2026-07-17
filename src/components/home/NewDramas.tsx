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
  region: string | null
  tags: string | null
  totalEpisodes: number | null
  createdAt: string
}

export default function NewDramas() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/home/new-dramas')
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
        <svg className="w-6 h-6 text-sky-500" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8M8 12h8" />
        </svg>
        <h2 className="text-xl font-extrabold text-[var(--text-primary)]">最新添加</h2>
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
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-gradient-to-r from-sky-500 to-sky-400 text-white text-[10px] font-bold shadow-sm">
                NEW
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-6 pb-2 px-2.5">
                <p className="text-[13px] font-bold text-white line-clamp-2 leading-tight drop-shadow">
                  {item.title}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </HorizontalSlider>

      <div className="flex justify-center mt-5">
        <Link
          href="/all?tag=new"
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
