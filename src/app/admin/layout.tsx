'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import Logo from '@/components/Logo'

const navItems = [
  { href: '/admin/drama', label: '影视管理', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
  )},
  { href: '/admin/stats', label: '数据统计', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
  )},
  { href: '/admin/banners', label: 'Banner管理', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  )},
  { href: '/admin/socials', label: '社交链接', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
  )},
  { href: '/admin/articles', label: '文章管理', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
  )},
  { href: '/admin/announcements', label: '公告管理', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
  )},
  { href: '/admin/requests', label: '求资源', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
  )},
  { href: '/admin/links-report', label: '链接报错', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
  )},
  { href: '/admin/comments', label: '评论管理', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
  )},
  { href: '/admin/settings', label: '站点设置', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  )},
  { href: '/admin/users', label: '用户管理', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
  )},
  { href: '/admin/invites', label: '邀请码管理', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
  )},
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [showBackTop, setShowBackTop] = useState(false)
  const [greeting, setGreeting] = useState('欢迎回来')
  const mainRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const h = new Date().getHours()
    if (h >= 8 && h < 12) setGreeting('开工啦，又是美好的一天，今天也要活力满满哦 😀')
    else if (h >= 12 && h < 22) setGreeting('💼 工作辛苦了，今天有没有好好吃饭呀')
    else setGreeting('已经深夜喽，注意好好休息 🛏️💤，明天才有活力呀')
  }, [])

  // 滚动到页面下半部分时显示回到顶部按钮
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const onScroll = () => {
      setShowBackTop(el.scrollTop > 10)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [authed])

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) {
          setAuthed(false)
          if (pathname !== '/admin') {
            router.replace('/admin')
          }
        } else {
          setAuthed(true)
        }
        setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [pathname, router])

  if (checking && pathname !== '/admin') {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <p className="text-[var(--text-muted)]">验证中...</p>
      </div>
    )
  }

  if (!authed && pathname !== '/admin') return null

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-secondary)]">
      {/* ===== 左侧边栏 ===== */}
      {authed && (
        <aside
          className={`shrink-0 flex flex-col bg-[var(--bg)] border-r border-[var(--border)] transition-all duration-300 ${
            collapsed ? 'w-[60px]' : 'w-[220px]'
          }`}
        >
          {/* Logo + 折叠按钮 */}
          <div className={`flex items-center h-14 px-3 border-b border-[var(--border)] ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed && <Logo />}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--brand)] hover:bg-[var(--bg-secondary)] transition-colors"
              title={collapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              <svg className="w-5 h-5 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                {collapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                )}
              </svg>
            </button>
          </div>

          {/* 导航菜单 */}
          <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
            {navItems.map(item => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group ${
                    active
                      ? 'bg-[var(--brand-pale)] text-[var(--brand)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--brand)] hover:bg-[var(--bg-secondary)]'
                  } ${collapsed ? 'justify-center px-2' : ''}`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className={`whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>

          {/* 底部操作 */}
          <div className={`border-t border-[var(--border)] p-2 space-y-0.5 ${collapsed ? 'px-1' : 'px-2'}`}>
            <Link
              href="/"
              target="_blank"
              title={collapsed ? '查看站点' : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--brand)] hover:bg-[var(--bg-secondary)] transition-colors ${collapsed ? 'justify-center px-2' : ''}`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              <span className={`whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>查看站点</span>
            </Link>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' })
                setAuthed(false)
                setChecking(true)
                router.push('/admin')
              }}
              title={collapsed ? '退出登录' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors ${collapsed ? 'justify-center px-2' : ''}`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              <span className={`whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>退出登录</span>
            </button>
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'px-3'} py-1`}>
              <ThemeToggle />
            </div>
          </div>
        </aside>
      )}

      {/* ===== 右侧主区域 ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 未登录时不需要顶栏，直接显示内容（登录页） */}
        {authed && (
          <header className="shrink-0 h-14 bg-[var(--bg)] border-b border-[var(--border)] flex items-center justify-end px-4 gap-2">
            <span className="text-xs text-[var(--text-muted)] mr-auto">{greeting}</span>
          </header>
        )}
        <main ref={mainRef} className="flex-1 overflow-auto relative">
          <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>

          {/* 回到顶部 */}
          <button
            type="button"
            onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className={`fixed bottom-6 right-6 z-[90] w-11 h-11 rounded-full bg-[var(--brand)] text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:shadow-xl hover:scale-110 active:scale-95 ${
              showBackTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
            title="回到顶部"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </main>
      </div>
    </div>
  )
}
