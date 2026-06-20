'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'

interface DramaLite {
  id: string
  title: string
  slug: string
  coverImage?: string | null
  imagePosition?: string | null
  region?: string | null
  tags?: string | null
  isCompleted?: boolean
  isOnSchedule?: boolean
  isUpcoming?: boolean
  totalEpisodes?: number | null
  currentEpisode?: number | null
  manualEpisode?: number | null
  premiereEpisodes?: number | null
  startDate?: string | null
}

interface FavItem {
  id: string
  userId: string
  dramaId: string
  createdAt: string
}

type FilterTab = 'all' | 'airing' | 'completed' | 'upcoming'

function getStatusLabel(d: DramaLite): { text: string; cls: string } | null {
  if (d.isCompleted) return { text: '已完结', cls: 'bg-black/50' }
  if (d.isUpcoming) return { text: '即将上线', cls: 'bg-[var(--warning)] text-white' }
  if (d.isOnSchedule) return { text: '播出中', cls: 'bg-[var(--success)] text-white' }
  return null
}

function getEpLabel(d: DramaLite): string {
  if (d.isCompleted && d.totalEpisodes) return `全 ${d.totalEpisodes} 集`
  let ep = d.manualEpisode ?? d.currentEpisode
  if (d.premiereEpisodes && d.startDate && new Date(d.startDate) <= new Date()) {
    ep = Math.max(ep || 0, d.premiereEpisodes)
  }
  if (ep && d.totalEpisodes) return `更新至 EP ${ep}`
  if (d.totalEpisodes) return `共 ${d.totalEpisodes} 集`
  return '敬请期待'
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr)
  const now = Date.now()
  const diffMs = now - d.getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 天前`
  const month = Math.floor(day / 30)
  if (month < 12) return `${month} 个月前`
  return `${Math.floor(day / 365)} 年前`
}

export default function FavoritesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<FavItem[]>([])
  const [dramas, setDramas] = useState<Record<string, DramaLite>>({})
  const [pageLoading, setPageLoading] = useState(true)
  const [tab, setTab] = useState<FilterTab>('all')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/favorites')
      const data = await res.json()
      if (data.items && data.dramas) {
        setItems(data.items)
        setDramas(data.dramas)
      }
    } catch {
      // ignore
    }
    setPageLoading(false)
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/'); return }
    load()
  }, [user, loading, router, load])

  const remove = async (dramaId: string) => {
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dramaId }),
    })
    setItems(prev => prev.filter(i => i.dramaId !== dramaId))
  }

  if (loading || pageLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center text-[var(--text-muted)]">加载中...</div>
    )
  }

  // 过滤
  const filtered = items.filter(item => {
    const d = dramas[item.dramaId]
    if (!d) return false
    if (tab === 'all') return true
    if (tab === 'airing') return d.isOnSchedule && !d.isCompleted
    if (tab === 'completed') return d.isCompleted
    if (tab === 'upcoming') return d.isUpcoming
    return true
  })

  const counts = {
    all: items.length,
    airing: items.filter(i => {
      const d = dramas[i.dramaId]
      return d && d.isOnSchedule && !d.isCompleted
    }).length,
    completed: items.filter(i => dramas[i.dramaId]?.isCompleted).length,
    upcoming: items.filter(i => dramas[i.dramaId]?.isUpcoming).length,
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
      {/* 标题区 */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-2xl md:text-[28px] font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)]">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </span>
            我的收藏
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1.5 ml-12">共 {items.length} 部 · 想看时点 ❤️ 收藏</p>
        </div>
      </div>

      {/* 筛选 Tab */}
      {items.length > 0 && (
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {([
            { key: 'all', label: '全部' },
            { key: 'airing', label: '播出中' },
            { key: 'completed', label: '已完结' },
            { key: 'upcoming', label: '即将上线' },
          ] as { key: FilterTab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.key
                  ? 'bg-[var(--brand)] text-white shadow-sm'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--brand-pale)] hover:text-[var(--brand)]'
              }`}
            >
              {t.label} <span className={`text-xs ml-1 ${tab === t.key ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>{counts[t.key]}</span>
            </button>
          ))}
        </div>
      )}

      {/* 内容 */}
      {filtered.length === 0 ? (
        items.length === 0 ? (
          <EmptyState onBrowse={() => router.push('/all')} />
        ) : (
          <div className="py-20 text-center text-[var(--text-muted)] text-sm">该分类下没有收藏</div>
        )
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {filtered.map(item => {
            const d = dramas[item.dramaId]
            if (!d) return null
            const status = getStatusLabel(d)
            return (
              <div key={item.id} className="group bg-[var(--bg-card)] rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                <Link href={`/drama/${d.slug}`} className="block">
                  <div className="relative aspect-[2/3] bg-gradient-to-br from-[#F4B8BA] to-[#E8A0A4]">
                    {d.coverImage ? (
                      <Image src={d.coverImage} alt={d.title} fill className="object-cover" style={{ objectPosition: d.imagePosition || 'center' }} sizes="(max-width: 640px) 50vw, 220px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/60 text-xs">暂无封面</div>
                    )}
                    {status && (
                      <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] text-white font-medium backdrop-blur-sm ${status.cls}`}>
                        {status.text}
                      </span>
                    )}
                    {/* 右上心形（已收藏标记） */}
                    <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[var(--bg-card)]/95 flex items-center justify-center text-[var(--brand)] shadow-sm">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                      </svg>
                    </span>
                  </div>
                </Link>
                <div className="p-2.5">
                  <Link href={`/drama/${d.slug}`} className="block text-sm font-semibold text-[var(--text-primary)] truncate hover:text-[var(--brand)] transition-colors">
                    {d.title}
                  </Link>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{getEpLabel(d)}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    收藏于 {timeAgo(item.createdAt)}
                  </p>
                  <div className="flex gap-1.5 mt-2">
                    <Link href={`/drama/${d.slug}`} className="flex-1 text-center py-1 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs hover:bg-[var(--brand-pale)] hover:text-[var(--brand)] transition-colors">
                      查看
                    </Link>
                    <button
                      onClick={() => remove(d.id)}
                      className="flex-1 py-1 rounded-md bg-[var(--bg-secondary)] text-[var(--text-muted)] text-xs hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 md:py-24">
      <div className="w-24 h-24 rounded-full bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)] mb-4">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
      </div>
      <p className="text-base text-[var(--text-secondary)] mb-1">还没有收藏的剧</p>
      <p className="text-sm text-[var(--text-muted)] mb-5">在剧集详情页点 ❤️ 收藏，把想看的剧存起来</p>
      <button
        onClick={onBrowse}
        className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#F4B8BA] to-[var(--brand)] text-white text-sm font-semibold shadow-md hover:opacity-90 active:scale-95 transition-all"
      >
        去发现好剧
      </button>
    </div>
  )
}
