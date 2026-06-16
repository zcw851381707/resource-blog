'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface SearchResult {
  id: string
  title: string
  slug: string
  coverImage?: string | null
  region?: string | null
  imagePosition?: string | null
}

export default function SearchButton() {
  const [expanded, setExpanded] = useState(false)
  const [focused, setFocused] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [hotDramas, setHotDramas] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // 关闭搜索：复位所有状态
  const closeSearch = useCallback(() => {
    setExpanded(false)
    setFocused(false)
    setQuery('')
    setResults([])
    setSelectedIdx(-1)
    inputRef.current?.blur()
  }, [])

  // 有焦点或鼠标悬停时展开
  const isOpen = expanded || focused

  // 加载热门推荐
  useEffect(() => {
    fetch('/api/search?hot=1').then(r => r.json()).then(setHotDramas)
  }, [])

  // 搜索
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
      setResults(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    setSelectedIdx(-1)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(value), 300)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    clearTimeout(timerRef.current)
    doSearch(query)
  }

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false)
        setExpanded(false)
        setQuery('')
        setResults([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Esc 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFocused(false)
        setExpanded(false)
        setQuery('')
        setResults([])
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // 键盘导航
  const allItems = query.trim() ? results : hotDramas
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(prev => Math.min(prev + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && selectedIdx >= 0 && allItems[selectedIdx]) {
      e.preventDefault()
      window.location.href = `/drama/${allItems[selectedIdx].slug}`
    }
  }

  const showHot = !query.trim() && results.length === 0
  const hasNoResults = query.trim() && !loading && results.length === 0
  const showDropdown = isOpen && (showHot || loading || results.length > 0 || hasNoResults)

  return (
    <>
      {/* 桌面端：hover/点击 展开搜索框 */}
      <div ref={containerRef} className="relative hidden md:flex items-center"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => { if (!focused) setExpanded(false) }}
      >
        {/* 展开的搜索面板：和右侧 X 按钮拼成一个整体，无间隙 */}
        <div
          className={`absolute right-full top-1/2 -translate-y-1/2 h-9 rounded-l-lg border-l border-y overflow-hidden transition-all duration-300 ease-out ${
            isOpen
              ? 'w-[220px] opacity-100 border-[var(--border)] bg-[var(--bg-secondary)]'
              : 'w-0 opacity-0 pointer-events-none border-transparent'
          }`}
        >
          <form onSubmit={handleSubmit} className="flex items-center h-full min-w-0">
            <svg className="w-4 h-4 ml-3 mr-2 text-[var(--text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="搜索剧集..."
              tabIndex={isOpen ? 0 : -1}
              className="flex-1 bg-transparent py-1.5 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] min-w-0"
            />
          </form>
        </div>

        {/* 右侧按钮：折叠态是放大镜（独立），展开态变成 X 并和输入面板拼成连体条 */}
        <button
          type="button"
          onClick={isOpen ? closeSearch : () => setExpanded(true)}
          aria-label={isOpen ? "关闭搜索" : "搜索"}
          title={isOpen ? "关闭" : "搜索"}
          className={`relative w-9 h-9 shrink-0 flex items-center justify-center active:scale-90 transition-all text-[var(--text-secondary)] ${
            isOpen
              ? 'rounded-r-lg border-r border-y border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]'
              : 'rounded-lg hover:bg-[var(--bg-secondary)]'
          }`}
        >
          {isOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </button>

        {/* 下拉面板：右对齐到展开输入面板的右边缘 */}
        {showDropdown && (
          <div className="absolute top-full mt-2 right-0 w-72 max-h-[360px] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xl z-50 animate-[scaleIn_0.2s_ease]">
            {loading && (
              <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                <span className="inline-block w-4 h-4 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                搜索中...
              </div>
            )}

            {showHot && hotDramas.length > 0 && (
              <div>
                <p className="px-4 pt-3 pb-1 text-xs font-medium text-[var(--text-muted)]">🔥 热门推荐</p>
                <div className="py-1">
                  {hotDramas.map((d, i) => (
                    <Link
                      key={d.id}
                      href={`/drama/${d.slug}`}
                      onClick={closeSearch}
                      className={`flex items-center gap-3 px-4 py-2 hover:bg-[var(--bg-secondary)] transition-colors ${
                        i === selectedIdx ? 'bg-[var(--bg-secondary)]' : ''
                      }`}
                    >
                      <div className="w-10 h-14 relative rounded overflow-hidden bg-[var(--bg-secondary)] shrink-0">
                        {d.coverImage ? (
                          <Image src={d.coverImage} alt={d.title} fill className="object-cover" style={{ objectPosition: d.imagePosition || 'center' }} sizes="40px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-[10px]">暂无</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{d.title}</p>
                        {d.region && <p className="text-xs text-[var(--text-muted)] mt-0.5">{d.region}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {query.trim() && !loading && results.length > 0 && (
              <div>
                <p className="px-4 pt-3 pb-1 text-xs font-medium text-[var(--text-muted)]">搜索结果</p>
                <div className="py-1">
                  {results.map((d, i) => (
                    <Link
                      key={d.id}
                      href={`/drama/${d.slug}`}
                      onClick={closeSearch}
                      className={`flex items-center gap-3 px-4 py-2 hover:bg-[var(--bg-secondary)] transition-colors ${
                        i === selectedIdx ? 'bg-[var(--bg-secondary)]' : ''
                      }`}
                    >
                      <div className="w-10 h-14 relative rounded overflow-hidden bg-[var(--bg-secondary)] shrink-0">
                        {d.coverImage ? (
                          <Image src={d.coverImage} alt={d.title} fill className="object-cover" style={{ objectPosition: d.imagePosition || 'center' }} sizes="40px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-[10px]">暂无</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{d.title}</p>
                        {d.region && <p className="text-xs text-[var(--text-muted)] mt-0.5">{d.region}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="px-4 pb-3 pt-1 text-center border-t border-[var(--border)] mt-1">
                  <p className="text-xs text-[var(--text-muted)] mb-2">不是这几部？可能是我们还没收录～</p>
                  <button
                    onClick={() => {
                      closeSearch()
                      window.open(`/request?q=${encodeURIComponent(query.trim())}`, '_blank')
                    }}
                    className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[var(--brand)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    💬 告诉我剧名
                  </button>
                </div>
              </div>
            )}

            {query.trim() && !loading && results.length === 0 && (
              <div className="px-4 py-4 text-center">
                <p className="text-sm text-[var(--text-secondary)] mb-1">
                  没找到「<span className="text-[var(--brand)] font-medium">{query.trim()}</span>」
                </p>
                <p className="text-xs text-[var(--text-muted)] mb-3">是不是打错字了？试试换个关键词搜搜看</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-[10px] text-[var(--text-muted)]">或者</span>
                  <span className="flex-1 h-px bg-[var(--border)]" />
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-3">
                  哎呀，这部我们还没收录呢 😅<br />告诉我们名字，让我去找找看！
                </p>
                <button
                  onClick={() => {
                    closeSearch()
                    window.open(`/request?q=${encodeURIComponent(query.trim())}`, '_blank')
                  }}
                  className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[var(--brand)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  💬 告诉我剧名
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 移动端：直接跳转搜索页 */}
      <Link href="/search" className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--bg-secondary)] active:scale-90 transition-all text-[var(--text-secondary)]">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </Link>
    </>
  )
}
