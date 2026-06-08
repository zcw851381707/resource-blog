'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface HorizontalSliderProps {
  children: React.ReactNode[]
  timeline?: (string | null)[]
}

export default function HorizontalSlider({ children, timeline }: HorizontalSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)
  const hasDragged = useRef(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const hasOverflow = el.scrollWidth > el.clientWidth + 1
    setCanScrollLeft(hasOverflow && el.scrollLeft > 0)
    setCanScrollRight(hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      ro.disconnect()
      window.removeEventListener('resize', checkScroll)
    }
  }, [checkScroll, children.length])

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current
    if (!el) return
    isDragging.current = true
    hasDragged.current = false
    startX.current = e.pageX - el.offsetLeft
    scrollLeft.current = el.scrollLeft
    el.style.cursor = 'grabbing'
    el.style.scrollSnapType = 'none'
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return
    const el = scrollRef.current
    if (!el) return
    const x = e.pageX - el.offsetLeft
    const walk = x - startX.current
    if (Math.abs(walk) > 5) hasDragged.current = true
    el.scrollLeft = scrollLeft.current - walk
  }

  const handleMouseUp = () => {
    const el = scrollRef.current
    if (!el) return
    isDragging.current = false
    el.style.cursor = 'grab'
    el.style.scrollSnapType = ''
  }

  const handleLinkClick = (e: React.MouseEvent) => {
    if (hasDragged.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const scrollAmount = el.clientWidth * 0.75
    el.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
  }

  if (children.length === 0) return null

  const showLeft = canScrollLeft && isHovered
  const showRight = canScrollRight && isHovered
  const hasTimeline = timeline && timeline.length > 0

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); handleMouseUp() }}
    >
      {/* 左箭头 */}
      <button
        onClick={() => scroll('left')}
        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-12 h-12 rounded-full bg-[var(--bg)] border border-[var(--border)] shadow-md hidden sm:flex items-center justify-center cursor-pointer hover:bg-[var(--bg-secondary)] hover:shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 ${showLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-label="向左滚动"
      >
        <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* 右箭头 */}
      <button
        onClick={() => scroll('right')}
        className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-12 h-12 rounded-full bg-[var(--bg)] border border-[var(--border)] shadow-md hidden sm:flex items-center justify-center cursor-pointer hover:bg-[var(--bg-secondary)] hover:shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 ${showRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-label="向右滚动"
      >
        <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* 滚动容器 — 时间线 + 卡片 */}
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hidden select-none"
        style={{ cursor: 'grab', touchAction: 'pan-y pan-x' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDragStart={handleDragStart}
      >
        {/* 时间线行 */}
        {hasTimeline && (
          <div className="flex gap-3 mb-2">
            {timeline!.map((label, i) => (
              <div
                key={i}
                className="shrink-0 w-[150px] md:w-[170px] lg:w-[190px] flex flex-col items-center"
              >
                <span className={`text-[11px] leading-tight mb-1 min-h-[16px] text-center ${label ? 'text-[var(--brand)] font-semibold' : 'text-[var(--text-muted)]'}`}>
                  {label || '敬请期待'}
                </span>
                <div className="relative flex items-center justify-center w-full h-3">
                  {i > 0 && (
                    <span className="absolute top-1/2 block" style={{ left: -6, right: '50%', height: 1, backgroundColor: 'var(--brand)', opacity: 0.3 }} />
                  )}
                  {i < timeline!.length - 1 && (
                    <span className="absolute top-1/2 block" style={{ left: '50%', right: -6, height: 1, backgroundColor: 'var(--brand)', opacity: 0.3 }} />
                  )}
                  <span className="relative z-10 block shrink-0" style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--brand)' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 卡片行 */}
        <div className="flex gap-3 snap-x snap-proximity pb-2">
          {children.map((child, i) => (
            <div
              key={i}
              className="snap-start shrink-0 w-[150px] md:w-[170px] lg:w-[190px]"
              onClickCapture={handleLinkClick}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
