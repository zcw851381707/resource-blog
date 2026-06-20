'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'
import Logo from '@/components/Logo'
import SearchButton from '@/components/SearchButton'
import { DesktopNav, MobileNav } from '@/components/NavLinks'
import Link from 'next/link'
import ShareModal from '@/components/ShareModal'
import { useAuth } from '@/lib/auth-context'

function UserMenu() {
  const { user, logout, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState({ watching: 0, favorites: 0, newEpisodes: 0, subscriptionNotifs: 0 })
  const [notifs, setNotifs] = useState<Array<{ id: string; type: string; title: string; content: string; isRead: boolean; createdAt: string }>>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // hover 控制：进入开（同时标记预约通知已读），离开关（带 300ms 延迟防止抖动）
  const onEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setOpen(true)
    // 标记预约通知已读
    if (counts.subscriptionNotifs > 0) {
      fetch('/api/subscriptions/mark-read', { method: 'POST' }).catch(() => {})
      setCounts(c => ({ ...c, subscriptionNotifs: 0 }))
    }
    // 标记通知已读
    if (unreadCount > 0) {
      fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        .then(() => {
          setNotifs(prev => prev.map(n => ({ ...n, isRead: true })))
          setUnreadCount(0)
        })
        .catch(() => {})
    }
  }
  const onLeave = () => {
    hoverTimer.current = setTimeout(() => setOpen(false), 300)
  }

  // 拉取追剧/收藏统计 + 计算有更新的剧数 + 未读预约通知
  useEffect(() => {
    if (!user) return
    const loadCounts = async () => {
      try {
        const [favRes, follRes, subUnreadRes] = await Promise.all([
          fetch('/api/favorites'),
          fetch('/api/following'),
          fetch('/api/subscriptions/unread').then(r => r.json()).catch(() => ({ count: 0 })),
        ])
        const favData = await favRes.json()
        const follData = await follRes.json()
        const follItems: Array<{ dramaId: string; status: string; progress: number }> = follData.items || []
        const dramas: Record<string, { isCompleted: boolean; currentEpisode: number | null; manualEpisode: number | null; premiereEpisodes: number | null; startDate: string | null }> = follData.dramas || {}
        // 追剧中且有更新（管理员集数 > 用户记录）
        let newEp = 0
        for (const it of follItems) {
          if (it.status !== 'watching') continue
          const d = dramas[it.dramaId]
          if (!d || d.isCompleted) continue
          let ep = d.manualEpisode ?? d.currentEpisode ?? 0
          if (d.premiereEpisodes && d.startDate && new Date(d.startDate) <= new Date()) {
            ep = Math.max(ep, d.premiereEpisodes)
          }
          if (ep > (it.progress || 0)) newEp++
        }
        setCounts({
          watching: follItems.filter(i => i.status === 'watching').length,
          favorites: (favData.items || []).length,
          newEpisodes: newEp,
          subscriptionNotifs: subUnreadRes.count || 0,
        })
      } catch {
        // ignore
      }
    }
    loadCounts()

    // 拉取通知
    const loadNotifs = async () => {
      try {
        const res = await fetch('/api/notifications')
        if (res.ok) {
          const data = await res.json()
          setNotifs(data.items || [])
          setUnreadCount(data.unreadCount || 0)
        }
      } catch { /* ignore */ }
    }
    loadNotifs()
    // 页面切回来时也刷新
    const onVis = () => {
      if (document.visibilityState === 'visible') { loadCounts(); loadNotifs() }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [user])

  if (!user) return null

  return (
    <div ref={ref} className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
      >
        <div className="relative shrink-0">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)] text-xs font-semibold">
              {user.username.slice(0, 1)}
            </div>
          )}
          {isAdmin && (
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#FFD700] flex items-center justify-center shadow-sm border-[1.5px] border-[var(--bg)]"
              title="管理员">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="#B8860B">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
            </span>
          )}
          {/* 有更新的红点（最高优先级：追剧新集数） */}
          {counts.newEpisodes > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-[var(--bg)]">
              {counts.newEpisodes > 9 ? '9+' : counts.newEpisodes}
            </span>
          ) : unreadCount > 0 ? (
            // 通知未读红点（无追剧新集数时才显示）
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-[var(--bg)]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
          {/* 预约通知蓝点（有更新优先显示更新红点，无更新才显示蓝点） */}
          {counts.subscriptionNotifs > 0 && counts.newEpisodes === 0 && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-[var(--bg)]" title="预约的剧已上线" />
          )}
          {/* 被禁言黄点 */}
          {user.mutedUntil && new Date(user.mutedUntil) > new Date() && (
            <span className="absolute -top-0.5 right-3 min-w-[14px] h-[14px] px-1 rounded-full bg-orange-500 text-white text-[8px] font-bold flex items-center justify-center border-2 border-[var(--bg)]" title="你已被禁言">
              ！
            </span>
          )}
        </div>
        <span className="text-sm text-[var(--text-secondary)] hidden md:inline">{user.username}</span>
        <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg py-1 min-w-[180px] z-50">
          <div className="px-4 py-2 text-[10px] text-[var(--text-muted)] uppercase tracking-wider">你好，{user.username}</div>
          {/* 禁言通知 */}
          {user.mutedUntil && new Date(user.mutedUntil) > new Date() && (
            <div className="mx-2 mb-1 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-[11px] text-orange-700 leading-relaxed">
              <p className="font-semibold mb-0.5">⚠️ 你已被禁言</p>
              <p className="text-[10px] opacity-80">
                {user.mutedReason || '请规范留言'} · 解除时间：{new Date(user.mutedUntil).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}
          <div className="h-px bg-[var(--border)] mx-2" />

          {/* 通知列表 */}
          {notifs.length > 0 && (
            <div className="px-2 pb-2">
              <div className="px-2 py-1.5 text-[10px] text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"/></svg>
                通知 {unreadCount > 0 && <span className="px-1 py-0.5 rounded text-[9px] font-semibold bg-red-500 text-white">{unreadCount} 未读</span>}
              </div>
              <div className="max-h-[280px] overflow-y-auto space-y-1.5">
                {notifs.slice(0, 8).map(n => (
                  <div key={n.id} className={`px-3 py-2 rounded-lg text-[11px] leading-relaxed ${n.type === 'MUTE' ? 'bg-orange-50 border border-orange-200 text-orange-700' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
                    <p className="font-semibold mb-0.5">{n.title}</p>
                    <p className="opacity-80 line-clamp-2">{n.content}</p>
                    <p className="text-[9px] opacity-60 mt-0.5">{timeAgoStr(n.createdAt)}</p>
                  </div>
                ))}
              </div>
              <div className="h-px bg-[var(--border)] mx-2 my-2" />
            </div>
          )}

          <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0116 0v2"/></svg>
            个人中心
          </Link>
          <Link href="/following" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M5 4h14l-1 7H6L5 4zM3 4H1m4 0v14a1 1 0 001 1h12a1 1 0 001-1V4M9 11h6"/></svg>
            <span className="flex-1">我的追剧</span>
            {counts.newEpisodes > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500 text-white">{counts.newEpisodes} 有更新</span>
            )}
            {counts.watching > 0 && counts.newEpisodes === 0 && (
              <span className="text-xs text-[var(--text-muted)]">{counts.watching}</span>
            )}
          </Link>
          <Link href="/favorites" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            <span className="flex-1">我的收藏</span>
            {counts.favorites > 0 && <span className="text-xs text-[var(--text-muted)]">{counts.favorites}</span>}
          </Link>
          <Link href="/subscriptions" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span className="flex-1">我的预约</span>
            {counts.subscriptionNotifs > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500 text-white">{counts.subscriptionNotifs}</span>
            )}
          </Link>
          <div className="h-px bg-[var(--border)] mx-2" />
          <button onClick={() => { logout(); setOpen(false) }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            退出登录
          </button>
        </div>
      )}
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

export function SiteHeader() {
  const pathname = usePathname()
  const [showShare, setShowShare] = useState(false)
  if (pathname.startsWith('/admin')) return null

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg)]/95 border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Logo />
        <DesktopNav />
        <div className="flex items-center gap-2">
          <SearchButton />
          <button
            type="button"
            onClick={() => setShowShare(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--bg-secondary)] active:scale-90 transition-all text-[var(--text-secondary)]"
            title="分享本站"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          <UserMenu />
          <ThemeToggle />
        </div>
      </div>

      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        shareData={{
          title: '晨光曦·分享站',
          text: '精选资源分享，每日更新 — 来这里发现好看的剧！',
          url: '/',
        }}
      />
    </header>
  )
}

export function SiteFooter() {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) return null

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-card)] pt-4 pb-[104px] md:pb-6 mt-auto">
      <div className="max-w-6xl mx-auto px-4 flex flex-col items-center gap-2">
        <p className="text-sm text-[var(--text-muted)]">
          &copy; {new Date().getFullYear()} 晨光曦·分享站
        </p>
        <Link href="/disclaimer" className="text-xs text-[var(--text-muted)] hover:text-[var(--brand)] hover:underline transition-colors">
          免责声明
        </Link>
      </div>
    </footer>
  )
}

export function SiteMobileNav() {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) return null
  return <MobileNav />
}
