'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface SearchResult {
  id: string
  title: string
  originalTitle?: string | null
  slug: string
  coverImage?: string | null
  region?: string | null
  imagePosition?: string | null
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [hotDramas, setHotDramas] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    fetch('/api/search?hot=1').then(r => r.json()).then(setHotDramas)
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
    setResults(await res.json())
    setLoading(false)
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(value), 300)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    clearTimeout(timerRef.current)
    doSearch(query)
  }

  const showHot = !query.trim() && results.length === 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6 text-center">搜索</h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="输入剧名搜索..."
          className="flex-1 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] text-base focus:outline-none focus:border-[var(--brand)]"
          autoFocus
        />
        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 active:scale-95 transition-all"
        >
          搜索
        </button>
      </form>

      {query.trim() && loading && (
        <p className="text-center text-[var(--text-muted)] py-8">搜索中...</p>
      )}

      {query.trim() && !loading && results.length === 0 && (
        <div className="text-center py-10 px-4">
          <p className="text-lg text-[var(--text-primary)] mb-2">
            没找到「<span className="font-semibold text-[var(--brand)]">{query.trim()}</span>」
          </p>
          <p className="text-sm text-[var(--text-secondary)] mb-1">是不是打错字了？试试换个关键词搜搜看</p>
          <div className="flex items-center gap-3 my-4">
            <span className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-muted)]">或者</span>
            <span className="flex-1 h-px bg-[var(--border)]" />
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            哎呀，这部我们还没收录呢 😅<br />
            告诉我们名字，让我去找找看！
          </p>
          <a
            href={`/request?q=${encodeURIComponent(query.trim())}`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 active:scale-95 transition-all"
          >
            💬 告诉我剧名
          </a>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <DramaList items={results} />
          <div className="text-center pt-12 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-xs text-[var(--text-muted)]">是这几部里的吗？</span>
              <span className="flex-1 h-px bg-[var(--border)]" />
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              都不是的话，可能是我们还没收录～
            </p>
            <p className="text-sm text-[var(--text-secondary)] mb-5">
              把剧名告诉我，我去帮你找找看！
            </p>
            <a href={`/request?q=${encodeURIComponent(query.trim())}`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 active:scale-95 transition-all">
              💬 告诉我剧名
            </a>
          </div>
        </div>
      )}

      {showHot && hotDramas.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">热门推荐</h2>
          <div className="space-y-3">
            <DramaList items={hotDramas} />
          </div>
        </div>
      )}
    </div>
  )
}

function DramaList({ items }: { items: SearchResult[] }) {
  return items.map(d => (
    <Link
      key={d.id}
      href={`/drama/${d.slug}`}
      className="flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--brand)] hover:shadow-sm transition-all"
    >
      <div className="w-12 h-16 relative rounded overflow-hidden bg-[var(--bg-secondary)] shrink-0">
        {d.coverImage ? (
          <Image src={d.coverImage} alt={d.title} fill className="object-cover" style={{ objectPosition: d.imagePosition || 'center' }} sizes="48px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-[10px]">无封面</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)]">{d.title || d.originalTitle}</p>
        {d.region && <p className="text-xs text-[var(--text-muted)] mt-0.5">{d.region}</p>}
      </div>
      <svg className="w-4 h-4 text-[var(--text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  ))
}
