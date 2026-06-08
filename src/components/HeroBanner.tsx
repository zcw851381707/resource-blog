'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

interface BannerData {
  id: string
  title: string
  subtitle?: string | null
  highlightWord?: string | null
  image?: string | null
  gradientFrom: string
  gradientTo: string
  buttonText?: string | null
  buttonLink?: string | null
}

export default function HeroBanner({ banners }: { banners: BannerData[] }) {
  const [current, setCurrent] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)
  const [animating, setAnimating] = useState(false)
  const [paused, setPaused] = useState(false)
  const dragging = useRef(false)
  const startX = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animatingRef = useRef(false)

  animatingRef.current = animating

  const goTo = useCallback((idx: number) => {
    if (animatingRef.current) return
    const target = ((idx % banners.length) + banners.length) % banners.length
    setAnimating(true)
    setCurrent(prev => {
      setPrev(prev)
      return target
    })
    setTimeout(() => { setAnimating(false); setPrev(null) }, 600)
  }, [banners.length])

  const next = useCallback(() => goTo(current + 1), [goTo, current])
  const prevFn = useCallback(() => goTo(current - 1), [goTo, current])

  useEffect(() => {
    if (paused || banners.length <= 1) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      return
    }
    timerRef.current = setInterval(() => {
      setCurrent(prev => {
        const next = (prev + 1) % banners.length
        setAnimating(true)
        setPrev(prev)
        setTimeout(() => { setAnimating(false); setPrev(null) }, 600)
        return next
      })
    }, 5600)
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [paused, banners.length])

  const handlePointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    startX.current = e.clientX
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return
    dragging.current = false
    const diff = e.clientX - startX.current
    if (Math.abs(diff) > 50) {
      diff < 0 ? next() : prevFn()
    }
  }

  const renderTitle = (title: string, highlight?: string | null) => {
    if (!highlight) return title
    const parts = title.split(`[${highlight}]`)
    return parts.map((part, i) => (
      <span key={i}>
        {part}
        {i < parts.length - 1 && (
          <span className="text-[#FFE0E0]">{highlight}</span>
        )}
      </span>
    ))
  }

  if (banners.length === 0) return null

  const stars = useMemo(() => [
    { w: 3, h: 3, top: 8, left: 12, delay: 0 },
    { w: 5, h: 4, top: 22, left: 35, delay: 1.2 },
    { w: 2, h: 5, top: 65, left: 8, delay: 0.5 },
    { w: 4, h: 3, top: 45, left: 55, delay: 2.1 },
    { w: 3, h: 4, top: 15, left: 75, delay: 0.8 },
    { w: 5, h: 2, top: 80, left: 42, delay: 1.8 },
    { w: 2, h: 3, top: 35, left: 90, delay: 2.5 },
    { w: 4, h: 5, top: 70, left: 25, delay: 0.3 },
    { w: 3, h: 2, top: 55, left: 65, delay: 1.5 },
    { w: 5, h: 4, top: 90, left: 80, delay: 2.8 },
    { w: 2, h: 3, top: 5, left: 50, delay: 1.0 },
    { w: 4, h: 3, top: 40, left: 18, delay: 2.2 },
  ], [])

  const renderBanner = (banner: BannerData, isFadingIn: boolean, isFadingOut: boolean) => (
    <div
      className={`absolute inset-0 transition-opacity duration-600 ${
        isFadingIn ? 'animate-bannerIn' : isFadingOut ? 'animate-bannerOut' : 'opacity-100'
      }`}
    >
      {banner.image ? (
        <>
          <img src={banner.image} alt={banner.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/45" />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${banner.gradientFrom}, ${banner.gradientTo})` }} />
      )}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map((star, i) => (
          <div
            key={i}
            className="star absolute rounded-full bg-white/30"
            style={{
              width: star.w + 'px', height: star.h + 'px',
              top: star.top + '%', left: star.left + '%',
              animationDelay: star.delay + 's',
            }}
          />
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center text-center py-16 md:py-24 px-6 h-full">
        <h2 className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight">
          {renderTitle(banner.title, banner.highlightWord)}
        </h2>
        {banner.subtitle && (
          <p className="text-white/80 text-sm md:text-base mb-6">{banner.subtitle}</p>
        )}
        {banner.buttonText && (
          <a
            href={banner.buttonLink || '#'}
            className="inline-block px-8 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-full border border-white/30 hover:bg-white/30 hover:scale-105 active:scale-95 transition-all duration-200 text-sm font-medium"
            onClick={e => e.stopPropagation()}
          >
            {banner.buttonText}
          </a>
        )}
      </div>
    </div>
  )

  return (
    <section
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none aspect-[2/1] md:aspect-[6/2]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {/* 上一张（淡出） */}
      {prev !== null && renderBanner(banners[prev], false, true)}
      {/* 当前张（淡入） */}
      {renderBanner(banners[current], prev !== null, false)}

      {/* 左右热区 — 鼠标悬停时显示箭头 */}
      {banners.length > 1 && (
        <>
          <div
            onClick={(e) => { e.stopPropagation(); prevFn() }}
            className="group/left absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer flex items-center justify-start pl-3"
          >
            <span className="w-9 h-9 rounded-full bg-black/20 text-white flex items-center justify-center opacity-0 group-hover/left:opacity-100 group-active/left:scale-90 transition-all duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </span>
          </div>
          <div
            onClick={(e) => { e.stopPropagation(); next() }}
            className="group/right absolute right-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer flex items-center justify-end pr-3"
          >
            <span className="w-9 h-9 rounded-full bg-black/20 text-white flex items-center justify-center opacity-0 group-hover/right:opacity-100 group-active/right:scale-90 transition-all duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </span>
          </div>
        </>
      )}

      {/* 底部小圆点 + 倒计时进度 */}
      {banners.length > 1 && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 px-3 py-1.5 rounded-full bg-black/10 backdrop-blur-sm hover:bg-black/25 transition-all duration-300"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setTimeout(() => setPaused(false), 2000)}
        >
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); goTo(i) }}
              onMouseEnter={() => goTo(i)}
              className="relative rounded-full transition-all duration-300 hover:scale-150 hover:shadow-[0_0_6px_rgba(255,255,255,0.6)]"
              style={{
                width: i === current ? '1.25rem' : '0.5rem',
                height: '0.5rem',
                backgroundColor: i === current ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
              }}>
              {i === current && !paused && (
                <span className="absolute inset-0 rounded-full overflow-hidden">
                  <span className="absolute inset-0 bg-[var(--brand)] rounded-full"
                    style={{ animation: 'carouselCountdown 6000ms linear infinite' }} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
