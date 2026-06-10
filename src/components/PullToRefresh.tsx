'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

function playRefreshSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const now = ctx.currentTime
    const osc1 = ctx.createOscillator(); const g1 = ctx.createGain()
    osc1.type = 'sine'; osc1.frequency.setValueAtTime(1200, now); osc1.frequency.exponentialRampToValueAtTime(1800, now + 0.06)
    g1.gain.setValueAtTime(0.3, now); g1.gain.exponentialRampToValueAtTime(0.01, now + 0.25)
    osc1.connect(g1); g1.connect(ctx.destination); osc1.start(now); osc1.stop(now + 0.3)
    const osc2 = ctx.createOscillator(); const g2 = ctx.createGain()
    osc2.type = 'sine'; osc2.frequency.setValueAtTime(2400, now + 0.02); osc2.frequency.exponentialRampToValueAtTime(3000, now + 0.08)
    g2.gain.setValueAtTime(0.15, now + 0.02); g2.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
    osc2.connect(g2); g2.connect(ctx.destination); osc2.start(now + 0.02); osc2.stop(now + 0.3)
    setTimeout(() => ctx.close(), 500)
  } catch {}
}

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const startX = useRef(0)
  const pulling = useRef(false)
  const direction = useRef<'unknown' | 'vertical' | 'horizontal'>('unknown')
  const router = useRouter()

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY > 5) return
    pulling.current = true
    direction.current = 'unknown'
    startY.current = e.touches[0].clientY
    startX.current = e.touches[0].clientX
    setPullDistance(0)
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current) return
    const dy = e.touches[0].clientY - startY.current
    const dx = e.touches[0].clientX - startX.current

    // 判断方向：横向滑动 > 纵向 → 放行，不拦截
    if (direction.current === 'unknown' && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      direction.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
    }
    if (direction.current === 'horizontal') {
      pulling.current = false
      setPullDistance(0)
      return
    }
    // 纵向下拉
    if (dy > 0) {
      setPullDistance(Math.min(dy * 0.45, 100))
      if (dy > 10) e.preventDefault()
    } else {
      pulling.current = false
      setPullDistance(0)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!pulling.current) return
    pulling.current = false
    if (pullDistance > 50) {
      setRefreshing(true)
      playRefreshSound()
      router.refresh()
      setTimeout(() => { setRefreshing(false); setPullDistance(0) }, 1000)
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, router])

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const progress = Math.min(pullDistance / 50, 1)

  return (
    <>
      {/* 固定顶部指示器，不影响页面布局 */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center transition-all duration-200 pointer-events-none"
        style={{
          marginTop: refreshing ? '44px' : `${Math.max(pullDistance - 10, 0)}px`,
          opacity: pullDistance > 0 || refreshing ? 1 : 0,
        }}
      >
        {refreshing ? (
          <div className="w-9 h-9 rounded-full bg-white/90 shadow-lg flex items-center justify-center">
            <svg className="w-5 h-5 animate-spin text-[var(--brand)]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : pullDistance > 10 ? (
          <div
            className="rounded-full border-2 flex items-center justify-center bg-white/90 shadow-lg transition-all"
            style={{
              width: `${20 + progress * 12}px`,
              height: `${20 + progress * 12}px`,
              borderColor: `color-mix(in srgb, var(--brand, #D47060) ${progress * 100}%, transparent)`,
              transform: `rotate(${progress * 360}deg)`,
            }}
          >
            <svg className="text-[var(--brand)]" style={{ width: `${10 + progress * 6}px`, height: `${10 + progress * 6}px` }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </div>
        ) : null}
      </div>

      {children}
    </>
  )
}
