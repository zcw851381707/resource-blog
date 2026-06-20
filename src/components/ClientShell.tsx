'use client'

import { AuthProvider } from '@/lib/auth-context'
import AuthGate from './AuthGate'
import VisitTracker from './VisitTracker'

import PullToRefresh from './PullToRefresh'
import { SiteHeader, SiteFooter, SiteMobileNav } from './SiteChrome'
import { usePathname } from 'next/navigation'

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')
  const isPublic = pathname.startsWith('/login') || pathname.startsWith('/agreement') || pathname.startsWith('/disclaimer')

  return (
    <AuthProvider>
      <VisitTracker />
      {isAdmin ? (
        <>{children}</>
      ) : isPublic ? (
        <main className="flex-1 pb-2 md:pb-0">
          <PullToRefresh>{children}</PullToRefresh>
        </main>
      ) : (
        <AuthGate>
          <SiteHeader />
          <main className="flex-1 pb-2 md:pb-0">
            <PullToRefresh>{children}</PullToRefresh>
          </main>
          <SiteMobileNav />
          <SiteFooter />
        </AuthGate>
      )}
    </AuthProvider>
  )
}
