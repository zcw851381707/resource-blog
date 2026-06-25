'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Drama {
  id: string
  title: string
  originalTitle?: string | null
  slug: string
  coverImage?: string | null
  expectedDate?: Date | string | null
  imagePosition?: string | null
}

interface UpcomingListProps {
  dramas: Drama[]
}

function ScrollRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const state = useRef({ startX: 0, moved: false, dragging: false, scrollStart: 0, lastX: 0, velocity: 0, targetScroll: 0, rafPending: false })
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateArrows = useCallback(() => {
    const el = ref.current
    if (!el) return
    const overflow = el.scrollWidth > el.clientWidth + 2
    if (!overflow) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    updateArrows()
    const frame = requestAnimationFrame(updateArrows)
    const ro = new ResizeObserver(updateArrows)
    ro.observe(el)
    el.addEventListener('scroll', updateArrows, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      el.removeEventListener('scroll', updateArrows)
    }
  }, [updateArrows])

  const snapToNearest = useCallback(() => {
    const el = ref.current
    if (!el) return
    const items = el.querySelectorAll<HTMLElement>('[data-snap-item]')
    if (items.length === 0) return
    const containerPadding = 16
    let bestIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < items.length; i++) {
      const itemLeft = items[i].offsetLeft - containerPadding
      const dist = Math.abs(el.scrollLeft - itemLeft)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    }
    const targetLeft = items[bestIdx].offsetLeft - containerPadding
    el.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' })
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    state.current.dragging = true
    state.current.startX = e.clientX
    state.current.lastX = e.clientX
    state.current.scrollStart = el.scrollLeft
    state.current.targetScroll = el.scrollLeft
    state.current.moved = false
    state.current.velocity = 0
    el.style.cursor = 'grabbing'
    el.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let inertiaRaf = 0
    let snapTimeout: ReturnType<typeof setTimeout>

    const applyScroll = () => {
      state.current.rafPending = false
      if (!state.current.dragging && Math.abs(state.current.velocity) < 0.5) return
      el.scrollLeft = state.current.targetScroll
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!state.current.dragging) return
      const dx = e.clientX - state.current.startX
      if (Math.abs(dx) > 3) state.current.moved = true
      state.current.targetScroll = state.current.scrollStart - dx
      state.current.velocity = e.clientX - state.current.lastX
      state.current.lastX = e.clientX
      if (!state.current.rafPending) {
        state.current.rafPending = true
        requestAnimationFrame(applyScroll)
      }
    }

    const onMouseUp = () => {
      state.current.dragging = false
      el.style.cursor = ''
      el.style.userSelect = ''
      let v = state.current.velocity
      if (Math.abs(v) < 0.5) {
        if (state.current.moved) {
          clearTimeout(snapTimeout)
          snapTimeout = setTimeout(snapToNearest, 50)
        }
        return
      }
      const decay = 0.92
      const tick = () => {
        v *= decay
        state.current.targetScroll -= v
        el.scrollLeft = state.current.targetScroll
        if (Math.abs(v) > 0.5) {
          inertiaRaf = requestAnimationFrame(tick)
        } else {
          clearTimeout(snapTimeout)
          snapTimeout = setTimeout(snapToNearest, 50)
        }
      }
      inertiaRaf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      cancelAnimationFrame(inertiaRaf)
      clearTimeout(snapTimeout)
    }
  }, [snapToNearest])

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (state.current.moved) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, [])

  const scroll = (dir: 'left' | 'right') => {
    const el = ref.current
    if (!el) return
    const amount = Math.max(200, Math.floor(el.clientWidth * 0.65))
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  const hasArrows = canScrollLeft || canScrollRight

  return (
    <div className="flex-1 flex items-center min-w-0 relative">
      {hasArrows && (
        <button
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          className={`absolute left-0 z-10 w-8 h-8 rounded-full hidden md:flex items-center justify-center transition-all shadow-md ${
            canScrollLeft
              ? 'bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      <div
        ref={ref}
        className="flex-1 overflow-x-auto scrollbar-hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onMouseDown={onMouseDown}
        onClickCapture={onClickCapture}
        onDragStart={(e) => e.preventDefault()}
      >
        {children}
      </div>
      {hasArrows && (
        <button
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          className={`absolute right-0 z-10 w-8 h-8 rounded-full hidden md:flex items-center justify-center transition-all shadow-md ${
            canScrollRight
              ? 'bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      )}
    </div>
  )
}

export default function UpcomingList({ dramas }: UpcomingListProps) {
  if (dramas.length === 0) return null

  return (
    <section className="mb-10">
      <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-4 text-center">即将上线HERE</h2>
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <ScrollRow>
          <div className="flex items-stretch gap-3 p-4 min-h-[240px]">
            {dramas.map((drama) => (
              <Link
                key={drama.id}
                href={`/drama/${drama.slug}`}
                draggable={false}
                data-snap-item
                className="group shrink-0 w-[140px] rounded-xl overflow-hidden bg-[var(--bg-secondary)] hover:bg-[var(--bg)] transition-colors"
              >
                <div className="relative aspect-[2/3] bg-[var(--bg-secondary)]">
                  {drama.coverImage ? (
                    <Image
                      src={drama.coverImage}
                      alt={drama.title}
                      fill
                      className="object-cover"
                      style={{ objectPosition: drama.imagePosition || 'center' }}
                      sizes="140px"
                      draggable={false}
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs">
                      暂无封面
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1 group-hover:text-[var(--brand)] transition-colors">{drama.title || drama.originalTitle}</p>
                  {drama.expectedDate && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 group-hover:text-[var(--brand)] transition-colors">
                      {new Date(drama.expectedDate).toLocaleDateString('zh-CN')}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </ScrollRow>
      </div>
    </section>
  )
}
