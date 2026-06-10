'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { toCanvas } from 'html-to-image'

interface DramaData {
  id: string
  title: string
  slug: string
  coverImage?: string | null
  airTime?: string | null
  airDays?: string | null
  pausedDays?: string | null
  isSuspended?: boolean
  isUpcoming?: boolean
  expectedDate?: Date | string | null
  currentEpisode?: number | null
  manualEpisode?: number | null
  totalEpisodes?: number | null
  episodesPerDay?: number | null
  isNewlyAired?: boolean
  imagePosition?: string | null
  seriesOrder?: number | null
  startDate?: Date | string | null
}

interface WeeklyCalendarProps {
  schedule: Record<string, DramaData[]>
}

const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function getTodayIndex(): number {
  const d = new Date().getDay()
  return d === 0 ? 6 : d - 1
}

function imgUrl(path: string): string {
  if (!path) return ''
  if (typeof window === 'undefined') return path
  if (path.startsWith('http')) return path
  return `${window.location.origin}${path}`
}

function getWeekDates(): Date[] {
  const now = new Date()
  const todayIdx = getTodayIndex()
  const monday = new Date(now)
  monday.setDate(now.getDate() - todayIdx)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function DramaItem({ drama, dayIndex, weekDates }: { drama: DramaData; dayIndex: number; weekDates: Date[] }) {
  const ep = drama.manualEpisode ?? drama.currentEpisode
  const todayIdx = getTodayIndex()

  // 判断今天是否已到首播日
  const isPremiered = drama.expectedDate && (() => {
    const d = new Date(drama.expectedDate)
    d.setHours(0, 0, 0, 0)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now >= d
  })()
  // 是否已进入首播周（用于决定显示"预计上线"还是正常集数）
  const isInPremiereWeek = drama.expectedDate && (() => {
    const d = new Date(drama.expectedDate!)
    const expectedDayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1
    const monday = new Date(d)
    monday.setDate(d.getDate() - expectedDayOfWeek)
    monday.setHours(0, 0, 0, 0)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now >= monday
  })()
  // 首播标签：进入首播周后整周显示
  const isPremiereDay = drama.expectedDate && (() => {
    const d = new Date(drama.expectedDate!)
    const expectedDayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1
    const monday = new Date(d)
    monday.setDate(d.getDate() - expectedDayOfWeek)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    const now = new Date()
    return now >= monday && now <= sunday
  })()

  // 从 startDate 起正向计算：到指定日期为止一共播出了多少集
  const isPausedDay = !!(drama.pausedDays && drama.pausedDays.split(',').map((s: string) => s.trim()).includes(String(dayIndex)))
  const isPremiere = !ep && (isPremiered || isInPremiereWeek)
  let displayEp: number | null | undefined = ep

  if (drama.airDays && drama.startDate) {
    const airDayIndices = drama.airDays.split(',').map(d => parseInt(d.trim()))
    if (airDayIndices.includes(dayIndex)) {
      const pausedIndices = (drama.pausedDays || '').split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
      const targetDate = weekDates[dayIndex]
      const startDate = new Date(drama.startDate)

      // 正向数：从开播日到目标日，一共多少个播出日
      let totalAirings = 0
      const cursor = new Date(startDate)
      cursor.setHours(0, 0, 0, 0)
      const endDate = new Date(targetDate)
      endDate.setHours(23, 59, 59, 999)

      while (cursor <= endDate) {
        const cursorIdx = cursor.getDay() === 0 ? 6 : cursor.getDay() - 1
        if (airDayIndices.includes(cursorIdx) && cursor >= startDate) {
          if (!pausedIndices.includes(cursorIdx)) {
            totalAirings++
          }
        }
        cursor.setDate(cursor.getDate() + 1)
      }

      if (isPremiere) {
        displayEp = totalAirings * (drama.episodesPerDay || 1)
      } else {
        displayEp = totalAirings * (drama.episodesPerDay || 1)
      }
    }
  }

  // 已完结剧集的展示集数不超总集数
  const totalEp = drama.totalEpisodes || 0
  if (displayEp && totalEp > 0 && displayEp > totalEp) {
    displayEp = totalEp
  }

  const handleClick = (e: React.MouseEvent) => {
    if (window.innerWidth >= 768) {
      e.preventDefault()
      window.open(`/drama/${drama.slug}`, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <Link
      href={`/drama/${drama.slug}`}
      draggable={false}
      onClick={handleClick}
      className="flex items-center gap-2.5 hover:bg-[var(--bg-secondary)] rounded-lg px-2 py-1.5 transition-colors shrink-0 w-[180px] md:w-[200px]"
    >
      <div className="w-10 h-[54px] relative rounded overflow-hidden bg-[var(--bg-secondary)] shrink-0">
        {drama.coverImage ? (
          <Image src={drama.coverImage} alt={drama.title} fill className="object-cover" style={{ objectPosition: drama.imagePosition || 'center' }} sizes="40px" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-[10px]">无封面</div>
        )}
      </div>
      <div className="w-[110px] md:w-[130px] shrink-0">
        <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1 leading-tight">{drama.title}{(drama.seriesOrder ?? 0) > 0 && ` 第${drama.seriesOrder}季`}</p>
        {drama.isUpcoming && drama.expectedDate && !isPremiered && !isInPremiereWeek ? (
          <p className="text-xs text-orange-500 mt-0.5">预计 {(() => {
            const d = new Date(drama.expectedDate!)
            const dateStr = `${d.getMonth() + 1}月${d.getDate()}日`
            return drama.airTime ? `${dateStr} ${drama.airTime}` : dateStr
          })()} 上线</p>
        ) : (() => {
          const total = drama.totalEpisodes || 0
          const premiereBadge = isPremiereDay || (!ep && drama.expectedDate && !isPremiered)
          const finishedBadge = total > 0 && displayEp && displayEp >= total && !isPausedDay
          const hasBadge = premiereBadge || finishedBadge || isPausedDay || drama.isSuspended

          const epText = (() => {
            if (drama.isSuspended) return null
            if (!displayEp) return null
            if (isPremiere && !isPremiered) return '首播'
            if (drama.totalEpisodes) return `第${displayEp}集/共${drama.totalEpisodes}集`
            return `第${displayEp}集`
          })()

          const timeText = (!isPausedDay && !drama.isSuspended && drama.airTime) ? drama.airTime : null

          if (hasBadge) {
            // 有标签：第2排 = 时间 + 集数，第3排 = 标签
            const row2: string[] = []
            if (timeText) row2.push(timeText)
            if (epText) row2.push(epText)

            const badges: React.ReactNode[] = []
            if (drama.isSuspended) badges.push(<span key="s" className="px-1.5 py-0.5 rounded bg-gray-400 text-white font-semibold text-[10px]">另行通知</span>)
            if (isPausedDay) badges.push(<span key="p" className="px-1.5 py-0.5 rounded bg-gray-400 text-white font-semibold text-[10px]">停播</span>)
            if (premiereBadge) badges.push(<span key="pr" className="px-1.5 py-0.5 rounded bg-pink-500 text-white font-semibold text-[10px]">首播</span>)
            if (finishedBadge) badges.push(<span key="fn" className="px-1.5 py-0.5 rounded bg-red-500 text-white font-semibold text-[10px]">完结</span>)

            if (row2.length === 0 && badges.length === 0) return null

            return (
              <>
                {row2.length > 0 && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{row2.join(' · ')}</p>
                )}
                {badges.length > 0 && (
                  <p className="text-xs mt-0.5 flex flex-wrap gap-1">{badges}</p>
                )}
              </>
            )
          }

          // 无标签：保持原来的三排布局
          if (!epText && !timeText) return null

          return (
            <div className="text-xs text-[var(--text-muted)] mt-0.5 space-y-0.5">
              {epText && <p>{epText}</p>}
              {timeText && <p>{timeText}</p>}
            </div>
          )
        })()}
      </div>
    </Link>
  )
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
    // 等一帧确保内容已渲染完成再测一次，避免 hasArrows 始终为 false
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

  const getX = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) return e.touches[0].pageX
    if ('pageX' in e) return e.pageX
    return 0
  }, [])

  // 触摸：仅检测是否拖动（滚动由浏览器原生处理），防止误触链接
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    state.current.startX = getX(e)
    state.current.moved = false
  }, [getX])

  const onTouchEnd = useCallback(() => {
    // 不需要额外操作，浏览器已处理滚动
  }, [])

  // 鼠标拖拽滚动（桌面端）
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
      if (Math.abs(v) < 0.5) return
      const decay = 0.92
      const tick = () => {
        v *= decay
        state.current.targetScroll -= v
        el.scrollLeft = state.current.targetScroll
        if (Math.abs(v) > 0.5) {
          inertiaRaf = requestAnimationFrame(tick)
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
    }
  }, [])

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (state.current.moved) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, [])

  const scroll = (dir: 'left' | 'right') => {
    const el = ref.current
    if (!el) return
    const itemWidth = 190
    const amount = Math.max(itemWidth * 2, Math.floor(el.clientWidth * 0.65))
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  const hasArrows = canScrollLeft || canScrollRight

  return (
    <div className="flex-1 flex items-center min-w-0 relative">
      {hasArrows && (
        <button
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          className={`absolute left-1 z-10 w-7 h-7 rounded-full hidden md:flex items-center justify-center transition-all shadow-md ${
            canScrollLeft
              ? 'bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      <div
        ref={ref}
        className="flex-1 overflow-x-auto scrollbar-hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onMouseDown={onMouseDown}
        onClickCapture={onClickCapture}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onDragStart={(e) => e.preventDefault()}
      >
        {children}
      </div>
      {hasArrows && (
        <button
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          className={`absolute right-1 z-10 w-7 h-7 rounded-full hidden md:flex items-center justify-center transition-all shadow-md ${
            canScrollRight
              ? 'bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      )}
    </div>
  )
}

export default function WeeklyCalendar({ schedule }: WeeklyCalendarProps) {
  const todayIdx = getTodayIndex()
  const weekDates = getWeekDates()
  const hasAny = Object.values(schedule).some(d => d.length > 0)
  const [shareState, setShareState] = useState<'idle' | 'preview' | 'generating' | 'done'>('idle')
  const [posterImageUrl, setPosterImageUrl] = useState<string | null>(null)
  const posterRef = useRef<HTMLDivElement>(null)
  // 每分钟刷新排序
  const [, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(timer)
  }, [])

  // 播出后排序：未播 → 即将播出(置顶) → 播完1小时内 → 播完超1小时，停播剧排最后
  // 规则：如果有任何剧进入"10分钟内播出"窗口，所有已播完但还在1小时内的剧直接挤到最后
  function sortByAiring(dramas: DramaData[], dayIndex: number): DramaData[] {
    const isPaused = (d: DramaData) => {
      const paused = (d.pausedDays || '').split(',').map(s => s.trim()).filter(Boolean)
      return paused.includes(String(dayIndex))
    }
    const now = new Date()
    const nowMins = now.getHours() * 60 + now.getMinutes()

    // 检查是否有剧即将播出（10分钟内）
    const hasIncoming = dramas.some(d => {
      if (!d.airTime || isPaused(d)) return false
      const airMins = parseInt(d.airTime.split(':')[0]) * 60 + parseInt(d.airTime.split(':')[1])
      return nowMins >= airMins - 10 && nowMins < airMins
    })

    return [...dramas].sort((a, b) => {
      // 停播剧排最后
      if (isPaused(a) !== isPaused(b)) return isPaused(a) ? 1 : -1
      // 今天按播出状态排，其他天按播出时间排
      if (dayIndex === todayIdx) {
        const getPriority = (d: DramaData) => {
          if (!d.airTime || isPaused(d)) return 2
          const airMins = parseInt(d.airTime.split(':')[0]) * 60 + parseInt(d.airTime.split(':')[1])
          if (nowMins < airMins - 10) return 0       // 未播（距离开播 > 10分钟）
          if (nowMins < airMins) return -1            // 10分钟内 → 置顶
          // 已播完：如果有其他剧即将播出，直接挤到最后
          if (hasIncoming) return 1
          if (nowMins < airMins + 60) return 0        // 播完1小时内 → 保持原位
          return 1                                     // 播完超1小时 → 末尾
        }
        // 全部播完超1小时后，恢复正常时间排序
        const allDone = dramas.filter(d => !isPaused(d) && d.airTime).every(d => getPriority(d) >= 1)
        if (!allDone) {
          const pa = getPriority(a)
          const pb = getPriority(b)
          if (pa !== pb) return pa - pb
        }
      }
      const [ah, am] = (a.airTime || '00:00').split(':').map(Number)
      const [bh, bm] = (b.airTime || '00:00').split(':').map(Number)
      return (ah * 60 + am) - (bh * 60 + bm)
    })
  }

  // 浮层打开时锁定 body 滚动
  useEffect(() => {
    if (shareState !== 'idle') {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [shareState])

  const handlePreview = () => {
    setPosterImageUrl(null)
    setShareState('preview')
  }
  const handleClose = () => {
    setPosterImageUrl(null)
    setShareState('idle')
  }

  const handleSave = async () => {
    if (shareState === 'done') {
      setPosterImageUrl(null)
      setShareState('preview')
      return
    }
    setShareState('generating')
    await new Promise(r => setTimeout(r, 100))
    const el = posterRef.current
    if (!el) {
      setShareState('preview')
      return
    }
    try {
      const isMobile = window.innerWidth < 768
      const scale = 2

      // Step 1: html-to-image 渲染布局（CSS 完美，但 Safari foreignObject 可能丢失图片）
      const canvas = await toCanvas(el, {
        pixelRatio: scale,
        backgroundColor: '#FFF5F5',
      })

      // Step 2: 手动把图片画到 canvas 正确位置（覆盖可能丢失的图片区域）
      const ctx = canvas.getContext('2d')!
      const elRect = el.getBoundingClientRect()
      const imgs = el.querySelectorAll('img')
      for (const img of Array.from(imgs)) {
        if (!img.complete || img.naturalWidth === 0) continue
        const ir = img.getBoundingClientRect()
        const x = (ir.left - elRect.left) * scale
        const y = (ir.top - elRect.top) * scale
        const w = ir.width * scale
        const h = ir.height * scale
        // object-fit: cover 需要裁剪
        const natW = img.naturalWidth
        const natH = img.naturalHeight
        const imgAspect = natW / natH
        const boxAspect = w / h
        let sx = 0, sy = 0, sw = natW, sh = natH
        if (imgAspect > boxAspect) {
          sw = natH * boxAspect
          sx = (natW - sw) / 2
        } else {
          sh = natW / boxAspect
          sy = (natH - sh) / 2
        }
        // objectPosition 偏移
        const pos = (img as HTMLElement).style.objectPosition || 'center'
        if (pos && pos !== 'center') {
          const [px, py] = pos.split(' ').map((v: string) => parseFloat(v) || 0)
          if (px && imgAspect > boxAspect) sx = px / 100 * (natW - sw)
          if (py && imgAspect <= boxAspect) sy = py / 100 * (natH - sh)
        }
        // 圆角裁剪
        const br = parseFloat((img as HTMLElement).style.borderRadius) || 0
        ctx.save()
        if (br > 0) {
          ctx.beginPath()
          ctx.moveTo(x + br, y)
          ctx.arcTo(x + w, y, x + w, y + h, br)
          ctx.arcTo(x + w, y + h, x, y + h, br)
          ctx.arcTo(x, y + h, x, y, br)
          ctx.arcTo(x, y, x + w, y, br)
          ctx.closePath()
          ctx.clip()
        }
        ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
        ctx.restore()
      }

      const dataUrl = canvas.toDataURL('image/png')
      const filename = `晨光曦·追剧日历${weekDates[0].getMonth() + 1}月${weekDates[0].getDate()}日.png`

      if (isMobile) {
        setPosterImageUrl(dataUrl)
        setShareState('done')
      } else {
        const link = document.createElement('a')
        link.download = filename
        link.href = dataUrl
        link.click()
        setShareState('done')
        setTimeout(() => {
          setPosterImageUrl(null)
          setShareState('idle')
        }, 2000)
      }
    } catch (e) {
      console.error('生成海报失败', e instanceof Error ? e.message : e)
      setPosterImageUrl(null)
      setShareState('preview')
    }
  }

  if (!hasAny) return null

  // 格式化海报用的星期标题
  const posterDayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  return (
    <section>
      <div className="flex items-center justify-center gap-4 mb-3">
        <h2 className="text-xl font-extrabold text-[var(--text-primary)]">追剧日历</h2>
        <button
          onClick={handlePreview}
          className="px-3 py-1 text-xs rounded-full bg-[var(--brand)] text-white hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        >
          📤 分享
        </button>
      </div>

      {/* 海报弹窗 */}
      {shareState !== 'idle' && (
        <>
        <div
          className="fixed inset-0 z-[200] bg-black/60 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="min-h-full flex flex-col items-center px-4 pb-4 gap-4" style={{ paddingTop: 'max(3.5rem, env(safe-area-inset-top))' }}>
            {/* 关闭按钮 — 纯色背景，高对比度 */}
            <div className="w-[calc(100vw-32px)] max-w-[390px] flex justify-end shrink-0">
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform shadow-lg border border-white/20"
                aria-label="关闭"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* 生成的图片 */}
            {shareState === 'done' && posterImageUrl && (
              <div className="w-[calc(100vw-32px)] max-w-[390px] shrink-0 flex flex-col items-center gap-4">
                <img
                  src={posterImageUrl}
                  alt="追剧日历海报"
                  className="w-full rounded-[20px]"
                  style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.35)' }}
                />
                <p className="text-white/80 text-sm">👆 长按图片 → 保存到相册</p>
              </div>
            )}
            {/* 海报 DOM — 始终挂载，生成后隐藏 */}
            <div
              ref={posterRef}
              className="w-[calc(100vw-32px)] max-w-[390px] shrink-0"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.06)', display: shareState === 'done' && posterImageUrl ? 'none' : 'block' }}>
                  {/* 海报头部 */}
                  <div style={{ padding: '24px 20px', background: 'linear-gradient(135deg, #F4B8BA 0%, #E8A0A4 50%, #DB8A90 100%)', color: '#fff', textAlign: 'center' }}>
                    <p style={{ fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '2px' }}>📺 追剧日历</p>
                    <p style={{ fontSize: '13px', margin: '6px 0 0', opacity: 0.9 }}>
                      {weekDates[0].getMonth() + 1}/{weekDates[0].getDate()} — {weekDates[6].getMonth() + 1}/{weekDates[6].getDate()}
                    </p>
                  </div>
                  {/* 点阵背景 */}
                  <div style={{ background: '#FFF5F5', padding: '12px 16px' }}>
                    {posterDayNames.map((day, idx) => {
                      const dramas = schedule[String(idx)] || []
                      const isToday = idx === todayIdx
                      return (
                        <div key={day} style={{ marginBottom: '10px', background: '#fff', borderRadius: '10px', padding: '10px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: isToday ? '1.5px solid #E8A0A4' : '1px solid transparent' }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: dramas.length > 0 ? '6px' : '0' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: isToday ? '#DB8A90' : '#555' }}>{day} {weekDates[idx].getMonth() + 1}/{weekDates[idx].getDate()}</span>
                            {isToday && <span style={{ fontSize: '10px', background: '#E8A0A4', color: '#fff', padding: '1px 6px', borderRadius: '8px', marginLeft: '6px' }}>今天</span>}
                          </div>
                          {dramas.length === 0 ? (
                            <p style={{ fontSize: '12px', color: '#e8c8ca', margin: 0, padding: '4px 0', textAlign: 'center' }}>— 今日休息 —</p>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                              {dramas.map((d, di) => {
                                const ep = d.manualEpisode ?? d.currentEpisode
                                const isPremiered = d.expectedDate && (() => {
                                  const ed = new Date(d.expectedDate!)
                                  ed.setHours(0, 0, 0, 0)
                                  const n = new Date()
                                  n.setHours(0, 0, 0, 0)
                                  return n >= ed
                                })()
                                const isInPremiereWeek = d.expectedDate && (() => {
                                  const ed = new Date(d.expectedDate!)
                                  const expectedDayOfWeek = ed.getDay() === 0 ? 6 : ed.getDay() - 1
                                  const monday = new Date(ed)
                                  monday.setDate(ed.getDate() - expectedDayOfWeek)
                                  monday.setHours(0, 0, 0, 0)
                                  const n = new Date()
                                  n.setHours(0, 0, 0, 0)
                                  return n >= monday
                                })()
                                const isPremiereDay = d.expectedDate && (() => { 
                                  const ed = new Date(d.expectedDate!) 
                                  const expectedDayOfWeek = ed.getDay() === 0 ? 6 : ed.getDay() - 1 
                                  const monday = new Date(ed) 
                                  monday.setDate(ed.getDate() - expectedDayOfWeek) 
                                  monday.setHours(0, 0, 0, 0) 
                                  const sunday = new Date(monday) 
                                  sunday.setDate(monday.getDate() + 6) 
                                  sunday.setHours(23, 59, 59, 999) 
                                  const n = new Date() 
                                  return n >= monday && n <= sunday 
                                })()
                                const posterIsPremiere = !ep && (isPremiered || isInPremiereWeek)
                                let displayEp: number | null | undefined = ep
                                const isPausedDay = !!(d.pausedDays && d.pausedDays.split(',').map((s: string) => s.trim()).includes(String(idx)))
                                if (d.airDays && d.startDate) {
                                  const airDayIndices = d.airDays.split(',').map((s: string) => parseInt(s.trim()))
                                  if (airDayIndices.includes(idx)) {
                                    const pausedIndices2 = (d.pausedDays || '').split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n))
                                    const targetDate = weekDates[idx]
                                    const start = new Date(d.startDate)
                                    let count = 0
                                    const cursor = new Date(start)
                                    cursor.setHours(0, 0, 0, 0)
                                    const end = new Date(targetDate)
                                    end.setHours(23, 59, 59, 999)
                                    while (cursor <= end) {
                                      const ci = cursor.getDay() === 0 ? 6 : cursor.getDay() - 1
                                      if (airDayIndices.includes(ci) && cursor >= start && !pausedIndices2.includes(ci)) {
                                        count++
                                      }
                                      cursor.setDate(cursor.getDate() + 1)
                                    }
                                    displayEp = count * (d.episodesPerDay || 1)
                                  }
                                }
                                // 已完结剧集展示集数不超总集数
                                if (displayEp && d.totalEpisodes && d.totalEpisodes > 0 && displayEp > d.totalEpisodes) {
                                  displayEp = d.totalEpisodes
                                }
                                const total = d.totalEpisodes || 0
                                const posterPaused = isPausedDay
                                const epLabel = d.isSuspended ? '' : (total > 0 && displayEp ? `第${displayEp}集/共${total}集` : displayEp ? `第${displayEp}集` : isPremiered ? '第1集' : '')
                                const showPremiere = isPremiereDay || (!ep && !d.isUpcoming)
                                const showFinished = total > 0 && displayEp && displayEp >= total && !posterPaused
                                const hasTag = showPremiere || showFinished || posterPaused || d.isSuspended
                                const line2: string[] = []
                                if (hasTag && d.airTime && !posterPaused && !d.isSuspended) line2.push(d.airTime)
                                if (d.isSuspended) line2.push('另行通知')
                                if (posterPaused) line2.push('停播')
                                if (epLabel) line2.push(epLabel)
                                if (!line2.length && d.isUpcoming && d.expectedDate && !isPremiered) {
                                  const ed = new Date(d.expectedDate!)
                                  line2.push(`${ed.getMonth() + 1}月${ed.getDate()}日`)
                                  if (d.airTime) line2.push(d.airTime)
                                }
                                return (
                                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', width: '50%', paddingTop: di >= 2 ? '6px' : '0' }}>
                                    {d.coverImage ? (
                                      <img src={imgUrl(d.coverImage)} alt="" style={{ width: '28px', height: '38px', objectFit: 'cover', objectPosition: d.imagePosition || 'center', borderRadius: '3px', flexShrink: 0 }} />
                                    ) : (
                                      <div style={{ width: '28px', height: '38px', background: '#fdf0f0', borderRadius: '3px', flexShrink: 0 }} />
                                    )}
                                    <div style={{ minWidth: 0, flex: 1, paddingLeft: '6px', paddingRight: di % 2 === 0 ? '3px' : '0' }}>
                                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#333', margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}{(d.seriesOrder ?? 0) > 0 ? ` 第${d.seriesOrder}季` : ''}</p>
                                      {line2.length > 0 && (
                                        <p style={{ fontSize: '10px', color: '#c8a0a4', margin: '1px 0 0' }}>{line2.join(' · ')}</p>
                                      )}
                                      {hasTag ? (
                                        <p style={{ fontSize: '10px', margin: '1px 0 0', display: 'flex' }}>
                                          {d.isSuspended && <span style={{ padding: '1px 5px', borderRadius: '3px', background: '#999', color: '#fff', fontWeight: 700, fontSize: '9px' }}>另行通知</span>}
                                          {posterPaused && <span style={{ padding: '1px 5px', borderRadius: '3px', background: '#aaa', color: '#fff', fontWeight: 700, fontSize: '9px' }}>停播</span>}
                                          {showPremiere && <span style={{ padding: '1px 5px', borderRadius: '3px', background: '#e06090', color: '#fff', fontWeight: 700, fontSize: '9px' }}>首播</span>}
                                          {showFinished && <span style={{ padding: '1px 5px', borderRadius: '3px', background: '#e04545', color: '#fff', fontWeight: 700, fontSize: '9px', marginLeft: (showPremiere ? '3px' : '0') }}>完结</span>}
                                        </p>
                                      ) : d.airTime ? (
                                        <p style={{ fontSize: '10px', color: '#c8a0a4', margin: '1px 0 0' }}>{d.airTime}</p>
                                      ) : null}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {/* Logo 底部 */}
                  <div style={{ background: '#FFF5F5', padding: '10px 20px 12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <img src={imgUrl('/晨.png')} alt="晨光曦·分享站" style={{ height: '28px', width: 'auto', objectFit: 'contain' }} />
                    </div>
                  </div>
                </div>

            {/* 保存按钮 */}
            <button
              type="button"
              onClick={handleSave}
              onTouchEnd={(e) => { e.preventDefault(); handleSave() }}
              disabled={shareState === 'generating'}
              className={`w-[calc(100vw-32px)] max-w-[390px] py-3 rounded-xl text-sm font-semibold active:scale-[0.98] transition-all shrink-0 shadow-lg ${
                shareState === 'generating'
                  ? 'bg-white/50 text-gray-500'
                  : 'bg-white text-gray-800 hover:bg-gray-100'
              } disabled:opacity-50`}
            >
              {shareState === 'generating' ? '生成中...' : shareState === 'done' ? '重新生成' : '保存图片'}
            </button>

            {/* 底部安全区留白 */}
            <div className="h-16 shrink-0 md:h-4"></div>
          </div>
        </div>
        </>
      )}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        {dayNames.map((day, idx) => {
          const dramas = schedule[String(idx)] || []
          const isToday = idx === todayIdx
          const isEmpty = dramas.length === 0
          const date = weekDates[idx]

          return (
            <div
              key={day}
              className={`flex border-b border-[var(--border)] last:border-b-0 ${
                isToday ? 'bg-[var(--brand-bg)]' : ''
              } ${isEmpty ? 'opacity-60' : ''}`}
            >
              <div className={`w-16 md:w-20 shrink-0 flex flex-col items-center justify-center py-3 border-r border-[var(--border)] ${
                isToday ? 'text-[var(--brand)] font-bold' : 'text-[var(--text-secondary)]'
              }`}>
                <span className="text-sm">{day}</span>
                <span className="text-[10px] text-[var(--text-muted)] mt-0.5">{date.getMonth() + 1}/{date.getDate()}</span>
                {isToday && <span className="text-[10px] mt-0.5 bg-[var(--brand)] text-white px-1.5 py-0.5 rounded-full">今天</span>}
              </div>

              {isEmpty ? (
                <div className="flex-1 flex items-center justify-center py-4">
                  <span className="text-xs text-[var(--text-muted)]">— 今天休息 —</span>
                </div>
              ) : (
                <ScrollRow>
                  <div className="flex items-center gap-1 p-2 min-h-[60px]">
                    {sortByAiring(dramas, idx).map((drama) => (
                      <DramaItem key={drama.id} drama={drama} dayIndex={idx} weekDates={weekDates} />
                    ))}
                  </div>
                </ScrollRow>
              )}
            </div>
          )
        })}
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-center gap-6 mt-3 py-1 text-[11px] text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>追剧中
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>新播
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-500"></span>已完结
        </span>
      </div>
    </section>
  )
}
