'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface ArticleItem {
  id: string; title: string; slug: string; coverImage: string | null; publishedAt: Date | null
}

const W = [195, 240, 290, 340, 290, 240, 195]
const GAP = -23
const OFFSETS = [-3, -2, -1, 0, 1, 2, 3]
const MAX_SCALE = 1; const MIN_SCALE = 0.55
const MAX_OPACITY = 1; const MIN_OPACITY = 0.3

function buildSlots() {
  const pos = [0, 0, 0, 0, 0, 0, 0]; const c = 3
  for (let i = 1; i <= 3; i++) {
    const prevHalf = W[c + i - 1] / 2; const myHalf = W[c + i] / 2
    pos[c + i] = pos[c + i - 1] + prevHalf + GAP + myHalf
    pos[c - i] = -pos[c + i]
  }
  return pos
}
const SLOTS = buildSlots()
const CARD_PITCH = SLOTS[4] - SLOTS[3]
const HALF_SPREAD = SLOTS[6]
const MAX_W = W[3]; const MIN_W = W[0]

function closestSlot(effectiveX: number): number {
  let best = 0, bestDist = Infinity
  for (let i = 0; i < SLOTS.length; i++) {
    const d = Math.abs(effectiveX - SLOTS[i])
    if (d < bestDist) { bestDist = d; best = i }
  }
  return best
}

export default function ArticleCarousel({ articles }: { articles: ArticleItem[] }) {
  const [centerIndex, setCenterIndex] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const router = useRouter()
  const n = articles.length

  const dragRef = useRef({ active: false, startX: 0, startY: 0, lastX: 0, lastY: 0 })
  const cardAreaRef = useRef<HTMLDivElement>(null)
  const goTo = (dir: number) => setCenterIndex(prev => ((prev + dir) % n + n) % n)

  const integralShift = dragOffset !== 0 ? Math.round(dragOffset / CARD_PITCH) : 0
  const fractionalOffset = dragOffset - integralShift * CARD_PITCH
  const displayIndex = ((centerIndex - integralShift) % n + n) % n

  function magneticX(offset: number): number {
    const baseX = SLOTS[offset + 3]
    const freeX = baseX + fractionalOffset
    const slot = closestSlot(freeX)
    const targetX = SLOTS[slot]
    const dist = freeX - targetX
    const snapZone = CARD_PITCH * 0.5
    if (Math.abs(dist) < snapZone) {
      const t = 1 - Math.abs(dist) / snapZone
      return freeX - dist * t * t * 0.55
    }
    return freeX
  }

  function smoothScale(ex: number) { const t = Math.min(Math.abs(ex) / HALF_SPREAD, 1); return MAX_SCALE - t * (MAX_SCALE - MIN_SCALE) }
  function smoothWidth(ex: number) { const t = Math.min(Math.abs(ex) / HALF_SPREAD, 1); return Math.round(MAX_W - t * (MAX_W - MIN_W)) }
  function smoothOpacity(ex: number) { const t = Math.min(Math.abs(ex) / HALF_SPREAD, 1); return MAX_OPACITY - t * (MAX_OPACITY - MIN_OPACITY) }

  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = { active: false, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY }
  }
  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return // 没按住鼠标，纯 hover，什么都不做
    const dr = dragRef.current
    if (!dr.active) {
      const dx = e.clientX - dr.startX; const dy = e.clientY - dr.startY
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return
      dr.active = true
      setIsDragging(true)
      if (cardAreaRef.current) cardAreaRef.current.style.touchAction = 'none'
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    }
    e.preventDefault()
    dr.lastX = e.clientX; dr.lastY = e.clientY
    setDragOffset(e.clientX - dr.startX)
  }
  const handlePointerEnd = (e: React.PointerEvent) => {
    const dr = dragRef.current
    if (dr.active) {
      if (cardAreaRef.current) cardAreaRef.current.style.touchAction = 'pan-y'
      try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
      const dist = dr.lastX - dr.startX
      const integral = Math.round(dist / CARD_PITCH)
      const displayIdx = ((centerIndex - integral) % n + n) % n
      let centerCardOffset = 0
      for (const off of OFFSETS) {
        if (closestSlot(magneticX(off)) === 3) { centerCardOffset = off; break }
      }
      setCenterIndex(((displayIdx + centerCardOffset) % n + n) % n)
      setDragOffset(0)
      setIsDragging(false)
    }
    dr.active = false
  }

  const arrowBtn = `flex-shrink-0 rounded-full bg-[var(--bg)] border border-[var(--border)] shadow-md flex items-center justify-center cursor-pointer hover:bg-[var(--bg-secondary)] hover:shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 z-20 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`

  return (
    <div className="flex items-center gap-1 sm:gap-2 w-full overflow-x-clip" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <button onClick={() => goTo(-1)} className={`w-8 h-8 sm:w-12 sm:h-12 ${arrowBtn}`} aria-label="上一篇">
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
      </button>

      <div ref={cardAreaRef} className="flex-1 flex items-center justify-center min-w-0 overflow-hidden select-none h-[200px] sm:h-[340px] xl:h-[380px]"
        style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={(e) => { if (cardAreaRef.current) cardAreaRef.current.style.touchAction = 'pan-y'; handlePointerEnd(e) }}>
        {OFFSETS.map(offset => {
          const articleIndex = ((displayIndex + offset) % n + n) % n
          const article = articles[articleIndex]
          const mx = magneticX(offset)
          const w = smoothWidth(mx); const scale = smoothScale(mx); const opacity = smoothOpacity(mx)
          const z = Math.round(10 - Math.abs(mx) / (HALF_SPREAD / 10))
          const isCenter = closestSlot(mx) === 3
          const trans = isDragging
            ? 'transform 0.06s linear, width 0.1s ease-out, opacity 0.1s ease-out'
            : 'transform 0.35s cubic-bezier(0.25, 0.1, 0.25, 1.0), width 0.35s ease-out, opacity 0.35s ease-out'

          return (
            <div key={offset} className="absolute" style={{
              transform: `translateX(${mx}px) scale(${scale})`,
              zIndex: z, opacity, left: '50%', marginLeft: -(w / 2), width: w, transition: trans,
            }} onClick={() => {
              if (isDragging) return
              if (isCenter) { router.push(`/articles/${article.slug}`) }
              else { goTo(offset) }
            }}>
              <div className={`rounded-xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border)] shadow-md cursor-pointer transition-shadow duration-200 ${isCenter ? 'shadow-lg' : 'hover:shadow-lg'}`}>
                <div className="relative aspect-[16/9] bg-[var(--bg-secondary)]">
                  {article.coverImage ? (
                    <Image src={article.coverImage} alt={article.title} fill className="object-cover pointer-events-none" sizes={`${w}px`} />
                  ) : (<div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-[10px]">暂无封面</div>)}
                  {article.id === articles[0]?.id && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[var(--brand)] text-white text-[10px] font-semibold shadow-sm">最新</span>
                  )}
                </div>
                <div className={isCenter ? 'p-2.5 sm:p-3' : 'p-2'}>
                  <h3 className={`font-bold text-[var(--text-primary)] line-clamp-2 leading-snug ${isCenter ? 'text-sm' : 'text-xs'}`}>{article.title}</h3>
                  {article.publishedAt && (
                    <p className="text-[var(--text-muted)] mt-1 text-right text-[10px]">{new Date(article.publishedAt).toISOString().slice(0, 10)}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={() => goTo(1)} className={`w-8 h-8 sm:w-12 sm:h-12 ${arrowBtn}`} aria-label="下一篇">
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  )
}
