'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { isUpcomingActive, calcCurrentEpisode } from '@/lib/drama-schedule-utils'

interface DramaInfo {
  id: string
  title: string
  slug: string
  totalEpisodes?: number | null
  currentEpisode?: number | null
  manualEpisode?: number | null
  airDays?: string | null
  airTime?: string | null
  description?: string | null
  region?: string | null
  tags?: string | null
  isCompleted?: boolean
  isOnSchedule?: boolean
  isNewlyAired?: boolean
  isUpcoming?: boolean
  expectedDate?: Date | string | null
  startDate?: Date | string | null
  premiereEpisodes?: number | null
  episodesPerDay?: number | null
}

interface BannerData {
  id: string
  title: string
  subtitle?: string | null
  highlightWord?: string | null
  image?: string | null
  mediaType?: string
  videoUrl?: string | null
  videoPoster?: string | null
  videoDuration?: number | null
  gradientFrom: string
  gradientTo: string
  buttonText?: string | null
  buttonLink?: string | null
  bannerLink?: string | null
  showButton?: boolean
  isPortrait?: boolean
  isAd?: boolean
  adLabel?: string | null
  portraitImages?: string | null
  dramaId?: string | null
  description?: string | null
  imagePosition?: string | null
  titleFont?: string | null  // 后台手动指定字体，null 则自动分配
}

// Banner 标题字体池（4款中文字体）
const cnFonts = [
  '"FontTitle-ChenYuluoyan", sans-serif',   // 清秀手写体
  '"FontTitle-Honglei", sans-serif',         // 豪放行书
  '"FontTitle-Ximai", sans-serif',           // 俏皮美术体
  '"FontTitle-XimaiXihuan", sans-serif',     // 圆润可爱体
]

// 检测文本语言
function detectLang(text: string): 'ja' | 'en' | 'cn' {
  // 日文：包含平假名或片假名
  if (/[぀-ゟ゠-ヿ]/.test(text)) return 'ja'
  // 英文：主要字符是拉丁字母
  const latinCount = (text.match(/[a-zA-Z]/g) || []).length
  if (latinCount > text.length * 0.5) return 'en'
  return 'cn'
}

// 根据标题语言 + ID 选字体
function pickFont(title: string, id: string): string {
  const lang = detectLang(title)
  if (lang === 'ja') return '"FontTitle-Hanasome", sans-serif'
  if (lang === 'en') return '"FontTitle-DancingScript", sans-serif'
  // 中文：确定性随机
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  return cnFonts[Math.abs(hash) % cnFonts.length]
}

const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

// 解析存储的图片位置，新格式 "left% top% zoom%"，兼容旧格式 "x% y%"
function parseImagePosition(pos: string | null | undefined): { left: number; top: number; zoom: number } {
  if (!pos || pos === 'center') return { left: -5, top: -5, zoom: 110 }
  const p = (s: string, def: number) => { const n = parseFloat(s); return isNaN(n) ? def : n }
  const parts = pos.split(/\s+/)
  if (parts.length >= 3) {
    return { left: p(parts[0], -5), top: p(parts[1], -5), zoom: p(parts[2], 110) }
  }
  const x = p(parts[0], 50)
  const y = p(parts[1], 50)
  const zoom = 110
  return {
    left: x * (100 - zoom) / 100,
    top: y * (100 - zoom) / 100,
    zoom,
  }
}

// 从海报提取主色调 + 宽高比（采样中央区域）
function extractImageInfo(imageUrl: string): Promise<{ r: number; g: number; b: number; aspectRatio: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight
      const canvas = document.createElement('canvas')
      const size = 80
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve({ r: 80, g: 80, b: 80, aspectRatio: ratio }); return }

      // 采样图片中间区域
      const sx = Math.round(img.naturalWidth * 0.3)
      const sy = Math.round(img.naturalHeight * 0.1)
      const sw = Math.round(img.naturalWidth * 0.4)
      const sh = Math.round(img.naturalHeight * 0.8)
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size)

      const data = ctx.getImageData(0, 0, size, size).data
      let r = 0, g = 0, b = 0, count = 0
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
        count++
      }
      resolve({
        r: Math.round(r / count),
        g: Math.round(g / count),
        b: Math.round(b / count),
        aspectRatio: ratio,
      })
    }
    img.onerror = () => resolve({ r: 80, g: 80, b: 80, aspectRatio: 1 })
    img.src = imageUrl
  })
}

export default function HeroBanner({ banners, dramas }: { banners: BannerData[]; dramas: DramaInfo[] }) {
  const [current, setCurrent] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [paused, setPaused] = useState(false)
  const [solidColors, setSolidColors] = useState<Record<string, string>>({})
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({})
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const [unmutedIds, setUnmutedIds] = useState<Set<string>>(new Set())
  const [canHover, setCanHover] = useState(true) // 默认 true 避免 SSR 闪烁，客户端再修正

  // 当前 banner 的视频是否开了声音
  const isCurrentUnmuted = unmutedIds.has(banners[current]?.id)

  // 轮播间隔：基础 8.6s（原 5.6s + 3s），视频额外 +6s
  const BASE_INTERVAL = 8600
  const VIDEO_EXTRA = 6000
  const currentInterval = banners[current]?.mediaType === 'video'
    ? BASE_INTERVAL + VIDEO_EXTRA
    : BASE_INTERVAL

  // 视频播放进度（0-100），用于开声音时的圆点倒计时
  const [videoProgress, setVideoProgress] = useState(0)

  useEffect(() => {
    setCanHover(window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  }, [])

  // 提取每张海报的主色调和宽高比（跳过视频）
  useEffect(() => {
    for (const banner of banners) {
      if (banner.mediaType === 'video') continue
      if (banner.image && !solidColors[banner.id]) {
        extractImageInfo(banner.image).then(info => {
          setSolidColors(prev => ({
            ...prev,
            [banner.id]: `rgba(${info.r},${info.g},${info.b},0.94)`,
          }))
          setImageRatios(prev => ({
            ...prev,
            [banner.id]: info.aspectRatio,
          }))
        })
      }
    }
  }, [banners])

  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const goTo = useCallback((idx: number) => {
    // 清除上一次动画的定时器，允许快速连续切换
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
    // 手动切页时清除所有开声音状态，恢复静音
    setUnmutedIds(prev => prev.size > 0 ? new Set() : prev)
    setVideoProgress(0)
    const target = ((idx % banners.length) + banners.length) % banners.length
    setDirection(target > current ? 'next' : 'prev')
    setCurrent(prev => { setPrev(prev); return target })
    animTimeoutRef.current = setTimeout(() => { setPrev(null) }, 600)
  }, [banners.length, current])

  const next = useCallback(() => goTo(current + 1), [goTo, current])
  const prevFn = useCallback(() => goTo(current - 1), [goTo, current])

  useEffect(() => {
    if (paused || isCurrentUnmuted || banners.length <= 1) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      return
    }

    const tick = () => {
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
      setDirection('next')
      setCurrent(prev => {
        const nextIdx = (prev + 1) % banners.length
        setPrev(prev)
        animTimeoutRef.current = setTimeout(() => { setPrev(null) }, 600)
        return nextIdx
      })
      timerRef.current = setTimeout(tick, currentInterval)
    }

    timerRef.current = setTimeout(tick, currentInterval)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [paused, isCurrentUnmuted, banners.length, currentInterval])

  // 拖拽滑动 vs 点击跳转
  const swipeRef = useRef({ startX: 0, startY: 0, moved: false, active: false })

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    // 点击按钮（圆点）或导航热区 → 不捕获，让它们自己的 onClick 处理
    if (target.closest('button') || target.closest('[data-nav]') || target.closest('[data-sound-toggle]')) return
    if (target.tagName === 'IMG') e.preventDefault()
    swipeRef.current = { startX: e.clientX, startY: e.clientY, moved: false, active: true }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!swipeRef.current.active) return
    if (Math.abs(e.clientX - swipeRef.current.startX) > 10 || Math.abs(e.clientY - swipeRef.current.startY) > 10) {
      swipeRef.current.moved = true
    }
  }
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!swipeRef.current.active) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    swipeRef.current.active = false
    const { startX, moved } = swipeRef.current
    if (moved) {
      // 拖拽滑动 → 切换 banner
      const dx = e.clientX - startX
      if (Math.abs(dx) > 25) {
        dx < 0 ? next() : prevFn()
      }
      return
    }
    // 纯点击 → 判断目标
    const target = e.target as HTMLElement
    const navZone = target.closest('[data-nav]')
    if (navZone) {
      const dir = navZone.getAttribute('data-nav')
      if (dir === 'left') prevFn()
      else if (dir === 'right') next()
      return
    }
    // 点击圆点由按钮自身处理（stopPropagation）
    if (target.closest('button')) return
    // 普通点击 → 跳转链接
    if (bannerHref) {
      handleBannerClick()
    }
  }

  const stars = useMemo(() => [
    { w: 3, h: 3, top: 8, left: 12, delay: 0 },
    { w: 5, h: 4, top: 22, left: 35, delay: 1.2 },
    { w: 2, h: 5, top: 65, left: 8, delay: 0.5 },
    { w: 4, h: 3, top: 15, left: 75, delay: 0.8 },
    { w: 5, h: 2, top: 80, left: 42, delay: 1.8 },
    { w: 2, h: 3, top: 35, left: 90, delay: 2.5 },
    { w: 3, h: 2, top: 55, left: 65, delay: 1.5 },
    { w: 5, h: 4, top: 90, left: 80, delay: 2.8 },
  ], [])

  if (banners.length === 0) return null

  const renderBanner = (banner: BannerData, isFadingIn: boolean, isFadingOut: boolean) => {
    const drama = banner.dramaId ? dramas.find(d => d.id === banner.dramaId) : null
    const hasImage = !!banner.image
    const solidBg = banner.image ? (solidColors[banner.id] || 'rgba(20,20,20,0.95)') : undefined
    const description = banner.description || drama?.description || null
    const title = banner.title || drama?.title || ''
    // 未播出 → 不显示集数
    const notAiredYet = drama ? isUpcomingActive(drama) || (drama.startDate ? new Date(drama.startDate as string) > new Date() : false) : false
    const ep = notAiredYet ? null : (drama ? calcCurrentEpisode({
      currentEpisode: drama.currentEpisode,
      manualEpisode: drama.manualEpisode,
      startDate: drama.startDate,
      premiereEpisodes: drama.premiereEpisodes,
      episodesPerDay: drama.episodesPerDay,
      airDays: drama.airDays,
      airTime: drama.airTime,
    }) : null)

    const airDayLabels = drama?.airDays
      ? drama.airDays.split(',').map(d => dayNames[parseInt(d.trim())]).join('、')
      : null

    const tagBadges: string[] = []
    if (drama?.region) {
      const regions = drama.region.split(',').filter(Boolean).slice(0, 2)
      tagBadges.push(...regions)
    }
    if (drama?.isCompleted) tagBadges.push('已完结')
    else if (drama?.isOnSchedule) tagBadges.push('追剧中')
    if (drama?.isNewlyAired) tagBadges.push('新播')
    if (drama && isUpcomingActive(drama) && drama.expectedDate) {
      const ed = new Date(drama.expectedDate as string)
      tagBadges.push(`${ed.getMonth() + 1}月${ed.getDate()}日上线`)
    }
    if (drama?.tags) tagBadges.push(drama.tags)

    const { left: imgLeft, top: imgTop, zoom: imgZoom } = parseImagePosition(banner.imagePosition)
    const imgRatio = imageRatios[banner.id]
    // 用户勾选了"竖版海报模式" → 右侧 contain
    const isPortrait = banner.isPortrait ?? false
    // 自动检测为竖图（宽高比 < 0.85）但未勾选竖版模式 → 只用高度约束
    // 竖图在 3:1 横版容器中，minWidth 会让图片高度撑爆到 400%+，只能看到一条缝
    // 只用 minHeight 则图片按高度缩放、宽度自适应，虽然窄但完整可见
    const isAutoPortrait = !isPortrait && imgRatio !== undefined && imgRatio < 0.85

    // 海报图片样式（前台 = 后台）
    // 三个分支都要加 maxWidth/maxHeight:'none'，否则 Tailwind preflight 的
    // img{max-width:100%;height:auto} 会把 width:215% 压回 100%、height 覆盖掉
    const posterImgStyle: React.CSSProperties = isPortrait
      ? {
          position: 'absolute',
          maxWidth: 'none',
          maxHeight: 'none',
          right: 0,
          top: 0,
          height: '100%',
          width: 'auto',
          objectFit: 'contain',
          objectPosition: 'right center',
        }
      : isAutoPortrait
      ? {
          // 竖图：与后台完全一致，left 定位 + 高度缩放
          position: 'absolute',
          maxWidth: 'none',
          maxHeight: 'none',
          left: `${imgLeft}%`,
          top: `${imgTop}%`,
          height: `${imgZoom}%`,
          width: 'auto',
          objectFit: 'contain',
        }
      : {
          // 横图：width 驱动，height 必须显式算（zoom/imgRatio%），否则 height:auto
          // 会让浏览器按自然比例算出超高（1609%），结果只看到顶部一小块
          // ⚠️ objectFit:'contain' + maxWidth/maxHeight:'none' 必加
          position: 'absolute',
          maxWidth: 'none',
          maxHeight: 'none',
          width: `${imgZoom}%`,
          height: imgRatio ? `${imgZoom / imgRatio}%` : 'auto',
          left: `${imgLeft}%`,
          top: `${imgTop}%`,
          objectFit: 'contain',
        }

    // 竖版海报的渐变遮罩：右侧图片 → 左侧实色底
    // 横图：objectFit:contain 后图片内容始终占据元素宽度的 33.3%~66.7%（与 zoom 无关）
    // 渐变从 34% 开始（确保图片边缘处 mask=0 完全透明），到 52% 全黑（18% 过渡区，平缓融入）
    const posterMask = (isPortrait || isAutoPortrait)
      ? 'linear-gradient(to right, transparent 0%, transparent 5%, black 30%, black 100%)'
      : 'linear-gradient(to right, transparent 0%, transparent 34%, black 52%, black 100%)'
    const posterMaskMobile = (isPortrait || isAutoPortrait)
      ? 'linear-gradient(to right, transparent 0%, transparent 5%, black 30%, black 100%)'
      : 'linear-gradient(to right, transparent 0%, transparent 10%, black 70%, black 100%)'

    // ========== 视频 Banner ==========
    if (banner.mediaType === 'video' && banner.videoUrl) {
      // 退场动画中的视频强制静音，避免重声
      const vidMuted = isFadingOut || !unmutedIds.has(banner.id)

      const videoElement = (
        <video
          ref={(el) => { if (el) videoRefs.current.set(banner.id, el) }}
          src={banner.videoUrl}
          poster={banner.videoPoster || undefined}
          loop={vidMuted}
          playsInline
          muted={vidMuted}
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          onLoadedMetadata={(e) => {
            const v = e.currentTarget
            v.muted = vidMuted
            v.play().catch(() => {})
          }}
          onTimeUpdate={(e) => {
            // 开声音时追踪播放进度，驱动圆点倒计时
            if (!vidMuted) {
              const v = e.currentTarget
              if (v.duration) setVideoProgress((v.currentTime / v.duration) * 100)
            }
          }}
          onEnded={() => {
            setVideoProgress(0)
            // 开声音时视频播完 → 自动切到下一页
            if (!vidMuted) {
              setUnmutedIds(prev => {
                const next = new Set(prev)
                next.delete(banner.id)
                return next
              })
              next()
            }
          }}
        />
      )

      const soundButton = (
        <button
          type="button"
          data-sound-toggle
          onClick={(e) => {
            e.stopPropagation()
            const v = videoRefs.current.get(banner.id)
            if (!v) return
            v.muted = !v.muted
            setUnmutedIds(prev => {
              const next = new Set(prev)
              if (v.muted) next.delete(banner.id)
              else next.add(banner.id)
              return next
            })
          }}
          className="absolute bottom-4 right-4 z-30 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          aria-label={vidMuted ? '开启声音' : '静音'}
        >
          {vidMuted ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.95 6.05a8 8 0 010 11.9" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
      )

      return (
        <div className={`absolute inset-0 ${
          isFadingIn ? (direction === 'next' ? 'animate-slideNextIn' : 'animate-slidePrevIn') : isFadingOut ? (direction === 'next' ? 'animate-slideNextOut' : 'animate-slidePrevOut') : ''
        }`}>
          <div className="relative h-full rounded-2xl overflow-hidden bg-black aspect-[5/4] md:aspect-[3/1]">
            {videoElement}
            {soundButton}
          </div>
        </div>
      )
    }

    if (!hasImage) {
      // 无海报图片：旧版居中渐变动画布局
      return (
        <div
          className={`absolute inset-0 ${
            isFadingIn ? (direction === 'next' ? 'animate-slideNextIn' : 'animate-slidePrevIn') : isFadingOut ? (direction === 'next' ? 'animate-slideNextOut' : 'animate-slidePrevOut') : ''
          }`}
        >
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${banner.gradientFrom}, ${banner.gradientTo})` }} />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {stars.map((star, i) => (
              <div key={i} className="star absolute rounded-full bg-white/30"
                style={{ width: star.w + 'px', height: star.h + 'px', top: star.top + '%', left: star.left + '%', animationDelay: star.delay + 's' }} />
            ))}
          </div>
          <div className="relative z-10 flex flex-col items-center justify-center text-center py-16 md:py-24 px-6 h-full">
            <h2 className="text-3xl md:text-6xl text-white mb-3 leading-tight"
              style={{ fontFamily: banner.titleFont ? `"${banner.titleFont}", sans-serif` : pickFont(title, banner.id), fontWeight: 400 }}>{title}</h2>
            {banner.subtitle && <p className="text-white/80 text-sm md:text-base mb-6">{banner.subtitle}</p>}
            {banner.showButton && (
              <span className="inline-flex items-center gap-1.5 px-8 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-full border border-white/30 text-sm font-medium pointer-events-none">
                {banner.buttonText || '查看详情'}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </span>
            )}
          </div>
        </div>
      )
    }

    // ========== 有海报图片 ==========

    // 竖版多图模式
    const portraitUrls = (banner.isPortrait && banner.portraitImages)
      ? banner.portraitImages.split(',').filter(Boolean)
      : []

    // 文字内容片段（桌面端用）
    const textContent = (
      <>
        {/* 剧名 */}
        <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl text-white mb-2 leading-tight drop-shadow-lg"
          style={{ fontFamily: banner.titleFont ? `"${banner.titleFont}", sans-serif` : pickFont(title, banner.id), fontWeight: 400 }}>
          {title}
        </h2>

        {/* 外语名 */}
        {banner.subtitle && (
          <p className="text-white/70 text-xs md:text-sm mb-1.5 drop-shadow-md">{banner.subtitle}</p>
        )}

        {/* 标签色块 */}
        {tagBadges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tagBadges.map((tag, i) => (
              <span key={i} className={`px-2 py-0.5 rounded-md text-[11px] font-semibold text-white shadow-sm ${
                tag === '已完结' ? 'bg-gray-500/80' :
                tag === '追剧中' ? 'bg-blue-500/80' :
                tag === '新播' ? 'bg-green-500/80' :
                tag.includes('上线') ? 'bg-amber-500/80' :
                'bg-white/20'
              }`}>{tag}</span>
            ))}
          </div>
        )}

        {/* 集数信息（未播出不显示） */}
        {!notAiredYet && (ep || drama?.totalEpisodes || drama?.premiereEpisodes) && (
          <p className="text-white/85 text-sm md:text-base mb-2">
            {drama?.isCompleted
              ? `已完结，共${drama.totalEpisodes}集`
              : drama?.premiereEpisodes && !ep
                ? `首播${drama.premiereEpisodes}集 / 共${drama.totalEpisodes}集`
                : ep && drama?.totalEpisodes
                  ? `更新至第${ep}集 / 共${drama.totalEpisodes}集`
                  : ep
                    ? `更新至第${ep}集`
                    : `共${drama?.totalEpisodes}集`}
          </p>
        )}

        {/* 播出时间 */}
        {(airDayLabels || drama?.airTime) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/75 text-xs md:text-sm mb-3">
            {airDayLabels && <span>📅 {airDayLabels}</span>}
            {drama?.airTime && <span>🕐 {drama.airTime}</span>}
          </div>
        )}

        {/* 简介 */}
        {description && (
          <p className="text-white/70 text-xs md:text-sm leading-relaxed line-clamp-2 mb-4">
            {description}
          </p>
        )}

        {/* 按钮 */}
        {banner.showButton && (
          <span className="self-start inline-flex items-center gap-1.5 px-6 py-2 rounded-full bg-white/25 backdrop-blur-sm text-white text-sm font-semibold border border-white/30 shadow-lg pointer-events-none">
            {banner.buttonText || '查看详情'}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </span>
        )}
      </>
    )

    // ===== 移动端：上下布局，flex 填满，图上文下，图片底部 mask 渐变淡出融入底色 =====
    const mobileLayout = (
      <div className="md:hidden flex flex-col h-full" style={{ background: solidBg }}>
        {/* 图片区：flex-1 占满可用空间，底部 mask 渐变淡出 */}
        <div className="relative flex-1 min-h-0" style={{
          maskImage: 'linear-gradient(to bottom, black 0%, black 65%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 65%, transparent 100%)',
        }}>
          {portraitUrls.length > 0 ? (
            <div className="flex w-full h-full">
              {portraitUrls.map((url, i) => (
                <img key={i} src={url} alt="" draggable={false}
                  className="h-full object-cover" style={{ width: `${100 / portraitUrls.length}%` }} />
              ))}
            </div>
          ) : (() => {
            // 移动端容器为 5:4，后台预览为 3:1，不能直接套用百分比
            // 从 imagePosition 反推用户在 3:1 容器里的"焦点"，再用 object-position 对准
            let mobileObjPos = '50% 50%'
            if (isPortrait) {
              mobileObjPos = 'right center'
            } else if (imgRatio !== undefined && imgZoom > 0) {
              // 焦点 = 3:1 容器中心落在图片上的坐标（图片自身 %）
              let fx = 50, fy = 50
              if (isAutoPortrait) {
                // 竖图：height=zoom%, width=zoom*imgRatio%
                fx = ((50 - imgLeft) / (imgZoom * imgRatio)) * 100
                fy = ((50 - imgTop) / imgZoom) * 100
              } else {
                // 横图：width=zoom%, height=zoom/imgRatio%
                fx = ((50 - imgLeft) / imgZoom) * 100
                fy = ((50 - imgTop) * imgRatio / imgZoom) * 100
              }
              fx = Math.max(0, Math.min(100, Math.round(fx)))
              fy = Math.max(0, Math.min(100, Math.round(fy)))
              mobileObjPos = `${fx}% ${fy}%`
            }
            return (
              <img
                src={banner.image!}
                alt={title}
                draggable={false}
                className="w-full h-full object-cover"
                style={{ objectPosition: mobileObjPos }}
              />
            )
          })()}
        </div>

        {/* 文字区：左标题，右信息 */}
        <div className="flex items-end gap-3 px-4 py-3">
          {/* 左侧：剧名 + 副标题 */}
          <div className="flex-1 min-w-0">
            <h2 className="text-4xl sm:text-5xl text-white leading-tight line-clamp-2 drop-shadow-lg"
              style={{ fontFamily: banner.titleFont ? `"${banner.titleFont}", sans-serif` : pickFont(title, banner.id), fontWeight: 400 }}>
              {title}
            </h2>
            {banner.subtitle && (
              <p className="text-white/50 text-xs mt-0.5 drop-shadow-md truncate">{banner.subtitle}</p>
            )}
          </div>
          {/* 右侧：标签 → 集数 → 播出时间 */}
          <div className="shrink-0 flex flex-col items-end gap-1 pb-0.5">
            {tagBadges.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-end">
                {tagBadges.slice(0, 3).map((tag, i) => (
                  <span key={i} className={`px-1.5 py-0.5 rounded text-[11px] font-semibold text-white whitespace-nowrap ${
                    tag === '已完结' ? 'bg-gray-500/80' :
                    tag === '追剧中' ? 'bg-blue-500/80' :
                    tag === '新播' ? 'bg-green-500/80' :
                    tag.includes('上线') ? 'bg-amber-500/80' :
                    'bg-white/20'
                  }`}>{tag}</span>
                ))}
              </div>
            )}
            {!notAiredYet && (ep || drama?.totalEpisodes || drama?.premiereEpisodes) && (
              <p className="text-white/70 text-xs whitespace-nowrap">
                {drama?.isCompleted
                  ? `已完结，共${drama.totalEpisodes}集`
                  : drama?.premiereEpisodes && !ep
                    ? `首播${drama.premiereEpisodes}集 / 共${drama.totalEpisodes}集`
                    : ep && drama?.totalEpisodes
                      ? `更新至第${ep}集 / 共${drama.totalEpisodes}集`
                      : ep
                        ? `更新至第${ep}集`
                        : `共${drama?.totalEpisodes}集`}
              </p>
            )}
            {(airDayLabels || drama?.airTime) && (
              <p className="text-white/50 text-[11px] whitespace-nowrap">
                {airDayLabels}{drama?.airTime ? ` ${drama.airTime}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    )

    // ===== 桌面端：实色底 + 图片渐变过渡 =====
    const desktopLayout = (
      <div
        className="hidden md:block relative rounded-2xl overflow-hidden"
        style={{ aspectRatio: '3/1', background: solidBg }}
      >
        {portraitUrls.length > 0 ? (
          /* 竖版多图：左右排列 */
          <div className="absolute inset-y-0 right-0 flex" style={{
            width: '60%',
            maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 100%)',
          }}>
            {portraitUrls.map((url, i) => (
              <img key={i} src={url} alt="" draggable={false}
                className="h-full object-cover" style={{ width: `${100 / portraitUrls.length}%` }} />
            ))}
          </div>
        ) : (
          /* 单张海报：mask 渐变让左边平滑过渡到底色 */
          <img
            src={banner.image!}
            alt={title}
            draggable={false}
            style={{
              ...posterImgStyle,
              maskImage: posterMask,
              WebkitMaskImage: posterMask,
            }}
          />
        )}

        {/* 文字内容（独立图层，左侧在海报主色背景上） */}
        <div
          className="absolute left-0 top-0 bottom-0 flex flex-col justify-center py-6"
          style={{ width: 'min(500px, 48%)', paddingLeft: '5%', paddingRight: '1rem' }}
        >
          {textContent}
        </div>
      </div>
    )

    return (
      <div
        className={`absolute inset-0 ${
          isFadingIn ? (direction === 'next' ? 'animate-slideNextIn' : 'animate-slidePrevIn') : isFadingOut ? (direction === 'next' ? 'animate-slideNextOut' : 'animate-slidePrevOut') : ''
        }`}
      >
        {mobileLayout}
        {desktopLayout}
        {banner.isAd && (
          <div className="absolute top-2 right-2 z-30 px-2 py-0.5 rounded text-[10px] font-semibold text-white bg-black/60 backdrop-blur-sm pointer-events-none">
            {banner.adLabel?.trim() || '广告'}
          </div>
        )}
      </div>
    )
  }

  const curBanner = banners[current]
  const curDrama = curBanner?.dramaId ? dramas.find(d => d.id === curBanner.dramaId) : null
  // 跳转优先级：关联剧集 > 自定义链接（bannerLink / buttonLink）
  // 关联了 dramaId 的 Banner 强制跳详情页；只有没关联剧集时才用 bannerLink / buttonLink
  const bannerHref = curDrama
    ? `/drama/${curDrama.slug}`
    : (curBanner?.bannerLink || curBanner?.buttonLink || null)

  const handleBannerClick = () => {
    if (!bannerHref) return
    if (window.innerWidth >= 768) {
      window.open(bannerHref, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = bannerHref
    }
  }

  return (
    <section
      className={`relative w-full select-none ${
        bannerHref ? 'cursor-pointer' : 'cursor-default'
      }`}
      onMouseEnter={() => canHover && setPaused(true)}
      onMouseLeave={() => canHover && setPaused(false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 统一轮播容器，响应式宽高比 */}
      <div className="relative rounded-2xl overflow-hidden aspect-[5/4] md:aspect-[3/1]">
        {prev !== null && renderBanner(banners[prev], false, true)}
        {renderBanner(banners[current], prev !== null, false)}

        {/* 左右热区 — 仅桌面端 */}
        {banners.length > 1 && (
          <>
            <div data-nav="left" onClick={(e) => { e.stopPropagation(); prevFn() }}
              className="hidden md:flex group absolute left-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer items-center justify-start pl-3">
              <span className="w-9 h-9 rounded-full bg-black/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 active:scale-90 transition-all duration-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </span>
            </div>
            <div data-nav="right" onClick={(e) => { e.stopPropagation(); next() }}
              className="hidden md:flex group absolute right-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer items-center justify-end pr-3">
              <span className="w-9 h-9 rounded-full bg-black/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 active:scale-90 transition-all duration-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </span>
            </div>
          </>
        )}

        {/* 桌面端底部圆点 — 容器内 absolute */}
        {banners.length > 1 && (
          <div className="hidden md:flex absolute bottom-3 left-1/2 -translate-x-1/2 gap-1.5 z-20 px-3 py-1.5 rounded-full bg-black/10 backdrop-blur-sm hover:bg-black/25 transition-all duration-300"
            onMouseEnter={() => canHover && setPaused(true)} onMouseLeave={() => canHover && setTimeout(() => setPaused(false), 2000)}>
            {banners.map((_, i) => (
              <button key={i} type="button" onClick={(e) => { e.stopPropagation(); goTo(i) }} onMouseEnter={() => goTo(i)}
                className="relative rounded-full transition-all duration-300 hover:scale-150 hover:shadow-[0_0_6px_rgba(255,255,255,0.6)]"
                style={{
                  width: i === current ? '1.25rem' : '0.5rem', height: '0.5rem',
                  backgroundColor: i === current ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                }}>
                {i === current && (!paused || isCurrentUnmuted) && (
                  <span className="absolute inset-0 rounded-full overflow-hidden">
                    <span className="absolute inset-0 bg-[var(--brand)] rounded-full"
                      style={isCurrentUnmuted
                        ? { width: `${videoProgress}%`, transition: 'width 0.25s linear' }
                        : { animation: `carouselCountdown ${currentInterval}ms linear infinite` }
                      } />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* 移动端圆点 — 容器内 absolute，叠加在图片上 */}
        {banners.length > 1 && (
          <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 px-3 py-1.5 rounded-full bg-black/5 backdrop-blur-sm">
          {banners.map((_, i) => (
            <button key={i} type="button" onClick={(e) => { e.stopPropagation(); goTo(i) }}
              className="relative rounded-full transition-all duration-300"
              style={{
                width: i === current ? '1.25rem' : '0.5rem', height: '0.5rem',
                backgroundColor: i === current ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
              }}>
              {i === current && (!paused || isCurrentUnmuted) && (
                <span className="absolute inset-0 rounded-full overflow-hidden">
                  <span className="absolute inset-0 bg-[var(--brand)] rounded-full"
                    style={isCurrentUnmuted
                      ? { width: `${videoProgress}%`, transition: 'width 0.25s linear' }
                      : { animation: `carouselCountdown ${currentInterval}ms linear infinite` }
                    } />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      </div>
    </section>
  )
}
