'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 复用一个 AudioContext，避免浏览器自动播放策略随机拦截
let _audioCtx: AudioContext | null = null
function getAudioContext(): AudioContext | null {
  try {
    if (!_audioCtx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      _audioCtx = new AC()
    }
    // iOS Safari 要求 resume() 必须在用户手势中同步调用
    if (_audioCtx.state === 'suspended') {
      _audioCtx.resume() // 不 await，在事件处理上下文中触发即可
    }
    return _audioCtx
  } catch { return null }
}

function playRefreshSound() {
  const ctx = getAudioContext()
  if (!ctx || ctx.state === 'closed') return
  try {
    const now = ctx.currentTime
    const playTone = (freq: number, start: number, vol: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(vol, start + 0.02)
      gain.gain.setValueAtTime(vol, start + 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.55)
    }
    playTone(660, now, 0.22)        // E5
    playTone(830, now + 0.07, 0.18) // G#5
  } catch {}
}

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const startX = useRef(0)
  const pulling = useRef(false)
  const direction = useRef<'unknown' | 'vertical' | 'horizontal'>('unknown')
  const distanceRef = useRef(0) // 用 ref 避免事件回调依赖 state
  const router = useRouter()

  // 同步 state → ref，事件回调只读 ref
  const updateDistance = useCallback((v: number) => {
    distanceRef.current = v
    setPullDistance(v)
  }, [])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // 预热 AudioContext：必须在用户手势中同步创建/恢复
    getAudioContext()
    // 有弹窗打开时（body overflow hidden），跳过下拉刷新
    if (document.body.style.overflow === 'hidden') return
    if (window.scrollY > 5) return
    pulling.current = true
    direction.current = 'unknown'
    startY.current = e.touches[0].clientY
    startX.current = e.touches[0].clientX
    updateDistance(0)
  }, [updateDistance])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current) return
    const dy = e.touches[0].clientY - startY.current
    const dx = e.touches[0].clientX - startX.current

    if (direction.current === 'unknown' && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      direction.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
    }
    if (direction.current === 'horizontal') {
      pulling.current = false
      updateDistance(0)
      return
    }
    if (dy > 0) {
      const dist = Math.min(dy * 0.45, 100)
      updateDistance(dist)
      e.preventDefault()
    } else {
      pulling.current = false
      updateDistance(0)
    }
  }, [updateDistance])

  const handleTouchEnd = useCallback(() => {
    if (!pulling.current) return
    pulling.current = false
    const dist = distanceRef.current // 读 ref，不依赖 state
    if (dist > 50) {
      setRefreshing(true)
      playRefreshSound()
      router.refresh()
      setTimeout(() => { setRefreshing(false); updateDistance(0) }, 1000)
    } else {
      updateDistance(0)
    }
  }, [router, updateDistance])

  // 事件绑定只用初始挂载一次（回调引用已稳定）
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
  const reachedThreshold = pullDistance >= 50

  return (
    <>
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center transition-all duration-200 pointer-events-none"
        style={{
          marginTop: refreshing ? '44px' : `${Math.max(pullDistance - 10, 0)}px`,
          opacity: pullDistance > 0 || refreshing ? 1 : 0,
        }}
      >
        {refreshing ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 shadow-lg">
            <svg className="w-4 h-4 animate-spin text-[var(--brand)]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs font-medium text-[var(--text-secondary)]">刷新中...</span>
          </div>
        ) : pullDistance > 10 ? (
          <div className={`flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/90 shadow-lg transition-all ${
            reachedThreshold ? 'scale-105' : ''
          }`}>
            <svg
              className="w-4 h-4 text-[var(--brand)] transition-transform duration-200"
              style={{ transform: reachedThreshold ? 'rotate(180deg)' : 'rotate(0deg)' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {reachedThreshold ? '松开刷新' : '下拉刷新'}
            </span>
          </div>
        ) : null}
      </div>

      {children}
    </>
  )
}
