'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import Logo from '@/components/Logo'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

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
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      {authed && (
        <header className="sticky top-0 z-50 bg-[var(--bg)]/95 border-b border-[var(--border)]">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center">
            <Logo />
            <div className="flex-1 flex justify-center gap-6 text-sm flex-wrap">
              {[
                { href: '/admin', label: '管理面板', exact: true },
                { href: '/admin/drama', label: '影视管理' },
                { href: '/admin/stats', label: '数据统计' },
                { href: '/admin/banners', label: 'Banner管理' },
                { href: '/admin/socials', label: '社交链接' },
                { href: '/admin/announcements', label: '公告管理' },
                { href: '/admin/requests', label: '求资源' },
                { href: '/admin/links-report', label: '链接报错' },
                { href: '/admin/settings', label: '站点设置' },
              ].map(item => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`transition-colors ${
                      active
                        ? 'text-[var(--brand)] font-extrabold text-base'
                        : 'text-[var(--text-secondary)] hover:text-[var(--brand)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
            <div className="flex items-center gap-3">
              <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors shrink-0">查看站点</Link>
              <button
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' })
                  setAuthed(false)
                  setChecking(true)
                  router.push('/admin')
                }}
                className="text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors shrink-0"
              >
                退出登录
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>
      )}
      <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
    </div>
  )
}
