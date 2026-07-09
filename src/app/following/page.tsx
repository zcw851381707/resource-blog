'use client'

import { useEffect, useState, useCallback } from 'react'
import { isUpcomingActive, calcCurrentEpisode } from '@/lib/drama-schedule-utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'

interface DramaLite {
  id: string
  title: string
  originalTitle?: string | null
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
  airDays?: string | null
  airTime?: string | null
  episodesPerDay?: number | null
}

interface FollowItem {
  id: string
  userId: string
  dramaId: string
  status: 'watching' | 'planned' | 'completed' | 'dropped'
  progress: number
  createdAt: string
  updatedAt: string
}

const STATUS_LABELS: Record<FollowItem['status'], string> = {
  watching: '追剧中',
  planned: '想看',
  completed: '已看完',
  dropped: '已弃剧',
}

const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function getAdminEp(d: DramaLite): number {
  return calcCurrentEpisode({
    currentEpisode: d.currentEpisode,
    manualEpisode: d.manualEpisode,
    startDate: d.startDate,
    premiereEpisodes: d.premiereEpisodes,
    episodesPerDay: d.episodesPerDay,
    airDays: d.airDays,
    airTime: d.airTime,
  })
}

// 判断追剧剧集是否"有更新"（管理员集数 > 用户记录集数，且未完结）
function hasNewEpisode(d: DramaLite, userProgress: number): boolean {
  if (d.isCompleted) return false
  const adminEp = getAdminEp(d)
  return adminEp > userProgress
}

export default function FollowingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<FollowItem[]>([])
  const [dramas, setDramas] = useState<Record<string, DramaLite>>({})
  const [pageLoading, setPageLoading] = useState(true)
  const [tab, setTab] = useState<FollowItem['status']>('watching')
  const [actionMenu, setActionMenu] = useState<string | null>(null) // dramaId

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/following')
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

  // 关闭动作菜单
  useEffect(() => {
    if (!actionMenu) return
    const handler = () => setActionMenu(null)
    setTimeout(() => document.addEventListener('click', handler, { once: true }), 0)
    return () => document.removeEventListener('click', handler)
  }, [actionMenu])

  const setStatus = async (dramaId: string, newStatus: FollowItem['status'] | 'remove') => {
    setActionMenu(null)
    await fetch('/api/following', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dramaId, status: newStatus }),
    })
    if (newStatus === 'remove') {
      setItems(prev => prev.filter(i => i.dramaId !== dramaId))
    } else {
      setItems(prev => prev.map(i => i.dramaId === dramaId ? { ...i, status: newStatus } : i))
    }
  }

  const setProgress = async (dramaId: string, ep: number) => {
    await fetch('/api/following', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dramaId, status: 'watching', progress: ep }),
    })
    setItems(prev => prev.map(i => i.dramaId === dramaId ? { ...i, progress: ep, status: 'watching' } : i))
  }

  if (loading || pageLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center text-[var(--text-muted)]">加载中...</div>
    )
  }

  const counts: Record<FollowItem['status'], number> = {
    watching: items.filter(i => i.status === 'watching').length,
    planned: items.filter(i => i.status === 'planned').length,
    completed: items.filter(i => i.status === 'completed').length,
    dropped: items.filter(i => i.status === 'dropped').length,
  }

  const list = items.filter(i => i.status === tab)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
      {/* 标题区 */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-2xl md:text-[28px] font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M5 4h14l-1 7H6L5 4zM3 4H1m4 0v14a1 1 0 001 1h12a1 1 0 001-1V4M9 11h6"/>
              </svg>
            </span>
            我的追剧
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1.5 ml-12">共 {items.length} 部 · 在追 {counts.watching} · 想看 {counts.planned}</p>
        </div>
      </div>

      {/* 状态 Tab */}
      {items.length > 0 && (
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {([
            { key: 'watching', label: '追剧中' },
            { key: 'planned', label: '想看' },
            { key: 'completed', label: '已看完' },
          ] as { key: FollowItem['status']; label: string }[]).map(t => (
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
      {list.length === 0 ? (
        items.length === 0 ? (
          <EmptyState onBrowse={() => router.push('/all')} />
        ) : (
          <div className="py-20 text-center text-[var(--text-muted)] text-sm">
            {tab === 'watching' && '还没有追的剧，去剧集详情页点"追剧"开始追吧'}
            {tab === 'planned' && '还没有想看的剧'}
            {tab === 'completed' && '还没有看完的剧'}
          </div>
        )
      ) : (
        <div className="space-y-3">
          {list.map(item => {
            const d = dramas[item.dramaId]
            if (!d) return null
            const adminEp = getAdminEp(d)
            const userEp = item.progress || 0
            const hasNew = tab === 'watching' && hasNewEpisode(d, userEp)
            const totalEp = d.totalEpisodes || adminEp || 0
            const progressPct = totalEp > 0 ? Math.min(100, Math.round((userEp / totalEp) * 100)) : 0

            return (
              <div
                key={item.id}
                className={`group bg-[var(--bg-card)] rounded-2xl p-3 md:p-4 flex gap-3 md:gap-4 shadow-sm hover:shadow-md transition-all ${
                  hasNew ? 'border-l-[3px] border-l-[var(--danger)]' : ''
                }`}
              >
                {/* 封面 */}
                <Link href={`/drama/${d.slug}`} className="shrink-0">
                  <div className="relative w-16 md:w-20 aspect-[2/3] rounded-lg overflow-hidden bg-gradient-to-br from-[#F4B8BA] to-[#E8A0A4]">
                    {d.coverImage ? (
                      <Image src={d.coverImage} alt={d.title} fill className="object-cover" style={{ objectPosition: d.imagePosition || 'center' }} sizes="80px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/60 text-[10px]">暂无</div>
                    )}
                    {hasNew && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[var(--danger)] border-2 border-[var(--bg-card)] animate-pulse" />
                    )}
                  </div>
                </Link>

                {/* 信息 */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <Link href={`/drama/${d.slug}`} className="text-sm md:text-base font-semibold text-[var(--text-primary)] hover:text-[var(--brand)] transition-colors truncate">
                        {d.title || d.originalTitle}
                      </Link>
                      {hasNew && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)]">
                          有新集
                        </span>
                      )}
                      {d.isCompleted && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-secondary)] text-[var(--text-muted)]">已完结</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] flex-wrap">
                      {!d.isCompleted && d.isOnSchedule && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--success-bg)] text-[var(--success)] font-medium">播出中</span>
                      )}
                      {isUpcomingActive(d) && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--warning-bg)] text-[var(--warning)] font-medium">即将上线</span>
                      )}
                      {d.airDays && !d.isCompleted && (
                        <span>{d.airDays.split(',').map(x => dayNames[parseInt(x)] || '').filter(Boolean).join('、')}{d.airTime ? ` ${d.airTime}` : ''}</span>
                      )}
                      {d.isCompleted && d.totalEpisodes && <span>全 {d.totalEpisodes} 集</span>}
                    </div>
                  </div>

                  {/* 进度条（仅追剧中） */}
                  {tab === 'watching' && !d.isCompleted && totalEp > 0 && (
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[var(--text-muted)]">
                      <span>看到</span>
                      <span className="text-[var(--brand)] font-semibold">EP {userEp || 1}</span>
                      <div className="flex-1 h-1.5 bg-[var(--brand-pale)] rounded-full overflow-hidden max-w-[160px]">
                        <div
                          className="h-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand-deep)] rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span>/ {totalEp} 集</span>
                    </div>
                  )}

                  {tab === 'completed' && (
                    <div className="text-[11px] text-[var(--text-muted)] mt-1">✓ 全部看完</div>
                  )}

                  {tab === 'planned' && isUpcomingActive(d) && (
                    <div className="text-[11px] text-[var(--text-muted)] mt-1">⏰ {d.startDate ? new Date(d.startDate).toLocaleDateString('zh-CN') : '即将上线'}</div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Link
                    href={`/drama/${d.slug}`}
                    className="px-3 py-1 rounded-full bg-[var(--brand-pale)] text-[var(--brand)] text-xs font-semibold hover:bg-[var(--brand)] hover:text-white transition-all"
                  >
                    {tab === 'watching' ? '继续看' : tab === 'planned' ? '开始追' : '重看'}
                  </Link>
                  {/* 进度标记（仅追剧中） */}
                  {tab === 'watching' && !d.isCompleted && totalEp > 0 && (
                    <ProgressPicker
                      current={userEp}
                      total={totalEp}
                      onChange={(ep) => setProgress(d.id, ep)}
                    />
                  )}
                  {/* … 菜单 */}
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === d.id ? null : d.id) }}
                      className="w-6 h-6 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] flex items-center justify-center"
                      title="更多操作"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
                      </svg>
                    </button>
                    {actionMenu === d.id && (
                      <div className="absolute right-0 top-7 z-10 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-[120px]">
                        {item.status !== 'planned' && (
                          <button onClick={() => setStatus(d.id, 'planned')} className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">移到「想看」</button>
                        )}
                        {item.status !== 'watching' && (
                          <button onClick={() => setStatus(d.id, 'watching')} className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">移到「追剧中」</button>
                        )}
                        {item.status !== 'completed' && (
                          <button onClick={() => setStatus(d.id, 'completed')} className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">标记已看完</button>
                        )}
                        <div className="h-px bg-[var(--border)] my-1" />
                        <button onClick={() => setStatus(d.id, 'remove')} className="w-full text-left px-3 py-1.5 text-xs text-[var(--danger)] hover:bg-[var(--danger-bg)]">取消追剧</button>
                      </div>
                    )}
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

function ProgressPicker({ current, total, onChange }: { current: number; total: number; onChange: (ep: number) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="px-2 py-0.5 rounded text-[10px] text-[var(--text-muted)] hover:text-[var(--brand)] hover:bg-[var(--bg-secondary)]"
      >
        看到 EP ?
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-10 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg p-2 min-w-[140px]">
          <p className="text-[10px] text-[var(--text-muted)] mb-1.5">标记看到第几集</p>
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: total }, (_, i) => i + 1).map(ep => (
              <button
                key={ep}
                onClick={() => { onChange(ep); setOpen(false) }}
                className={`text-xs py-1 rounded ${
                  ep === current
                    ? 'bg-[var(--brand)] text-white font-semibold'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--brand-pale)] hover:text-[var(--brand)]'
                }`}
              >
                {ep}
              </button>
            ))}
          </div>
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
          <path d="M5 4h14l-1 7H6L5 4zM3 4H1m4 0v14a1 1 0 001 1h12a1 1 0 001-1V4M9 11h6"/>
        </svg>
      </div>
      <p className="text-base text-[var(--text-secondary)] mb-1">还没有追任何剧</p>
      <p className="text-sm text-[var(--text-muted)] mb-5">在剧集详情页点"追剧"，会出现在这里</p>
      <button
        onClick={onBrowse}
        className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#F4B8BA] to-[var(--brand)] text-white text-sm font-semibold shadow-md hover:opacity-90 active:scale-95 transition-all"
      >
        去发现好剧
      </button>
    </div>
  )
}
