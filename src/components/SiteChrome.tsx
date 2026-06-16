'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'
import Logo from '@/components/Logo'
import SearchButton from '@/components/SearchButton'
import { DesktopNav, MobileNav } from '@/components/NavLinks'
import Link from 'next/link'
import ShareModal from '@/components/ShareModal'

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
