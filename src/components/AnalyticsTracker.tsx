'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function AnalyticsTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return
    try {
      navigator.sendBeacon?.('/api/analytics', JSON.stringify({ event: 'page_view', page: pathname }))
    } catch {}
  }, [pathname])

  return null
}
