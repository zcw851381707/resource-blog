'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navLinks = [
  { href: '/', label: '首页' },
  { href: '/all', label: '全部剧集' },
  { href: '/schedule', label: '追剧日历' },
  { href: '/request', label: '求资源' },
]

export function DesktopNav() {
  const pathname = usePathname()

  return (
    <nav className="hidden md:flex items-center gap-6 text-sm text-[var(--text-secondary)]">
      {navLinks.map(link => {
        const active = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative transition-colors hover:text-[var(--brand)] active:scale-95 inline-block ${
              active ? 'text-[var(--brand)] font-semibold' : ''
            }`}
          >
            {link.label}
            {active && (
              <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-[var(--brand)] rounded-full" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}

const navIcons: Record<string, React.ReactNode> = {
  '/': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
    </svg>
  ),
  '/all': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  '/schedule': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  '/request': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
    </svg>
  ),
}

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[var(--border)] bg-[var(--bg)]/95 safe-area-bottom pb-[env(safe-area-inset-bottom)]">
      {navLinks.map(link => {
        const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center flex-1 py-1 text-[10px] transition-all active:scale-95 ${
              active ? 'text-[var(--brand)] font-semibold' : 'text-[var(--text-muted)]'
            }`}
          >
            <span className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
              active ? 'bg-[var(--brand-pale)]' : ''
            }`}>
              {navIcons[link.href]}
              {link.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
