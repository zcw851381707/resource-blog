'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import DramaGrid from '@/components/DramaGrid'
import ShareModal from '@/components/ShareModal'
import { isNewlyAiredActive, isRecentlyCompleted, isUpcomingActive, calcCurrentEpisode } from '@/lib/drama-schedule'
import { useAuth } from '@/lib/auth-context'

interface DramaInfo {
  id: string
  title: string
  slug: string
  coverImage?: string | null
  region?: string | null
  category?: string
  isCompleted?: boolean
  completedAt?: string | null
  isOnSchedule?: boolean
  isNewlyAired?: boolean
  isUpcoming?: boolean
  expectedDate?: string | null
  expectedPrecision?: string | null
  tags?: string | null
  totalEpisodes?: number | null
  currentEpisode?: number | null
  manualEpisode?: number | null
  airDays?: string | null
  airTime?: string | null
  description?: string | null
  videoUrl?: string | null
  videoLabel?: string | null
  seriesOrder?: number | null
  imagePosition?: string | null
  originalTitle?: string | null
  scheduleImage?: string | null
  startDate?: string | null
  premiereEpisodes?: number | null
  episodesPerDay?: number | null
}

// 根据视频链接自动识别平台名称
function getVideoPlatform(url: string): string | null {
  if (/bilibili\.com|b23\.tv|biliapp\.com/.test(url)) return 'B站'
  if (/weibo\.com|weibo\.cn/.test(url)) return '微博'
  return null
}

interface LinkInfo {
  id: string
  platform: string
  url: string
  extractCode?: string | null
  label?: string | null
}

interface RelatedInfo {
  id: string
  title: string
  originalTitle?: string | null
  slug: string
  coverImage?: string | null
  clickCount: number
  imagePosition?: string | null
}

const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const reportReasons = ['链接失效', '缺少集数', '文件错放', '提取码错误']

function getPlatformLines(platform: string): string[] {
  return [platform]
}

function getUpcomingLabel(dateStr?: string | null, precision?: string | null): string | null {
  if (!dateStr) return '敬请期待'
  const d = new Date(dateStr)
  const prec = precision || 'day'
  if (prec === 'year') return `${d.getFullYear()}年开播`
  if (prec === 'month') return `${d.getMonth() + 1}月开播`
  return `${d.getMonth() + 1}月${d.getDate()}日开播`
}

function getEpisodeLabel(d: DramaInfo): string {
  if (d.isCompleted) {
    // 完结 30 天内 → "已完结，共X集"；之后 → "全X集"
    if (d.completedAt) {
      const completedDate = new Date(d.completedAt)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 30)
      if (completedDate >= cutoff) {
        if (d.totalEpisodes) return `已完结，共${d.totalEpisodes}集`
        return '已完结'
      }
    }
    // 完结超 30 天或无完结日期
    if (d.totalEpisodes) return `全${d.totalEpisodes}集`
    return '已完结'
  }
  // 集数：手动指定优先（0 视为未设置），否则按首播日期 + 播出日 + 集数规则自动计算
  const hasManual = d.manualEpisode != null && d.manualEpisode > 0
  let ep = hasManual ? d.manualEpisode : calcCurrentEpisode({
    currentEpisode: d.currentEpisode,
    manualEpisode: d.manualEpisode,
    startDate: d.startDate,
    premiereEpisodes: d.premiereEpisodes,
    episodesPerDay: d.episodesPerDay,
    airDays: d.airDays,
    airTime: d.airTime,
  })
  if (ep && d.totalEpisodes) return `更新至第${ep}集，共${d.totalEpisodes}集`
  if (ep) return `更新至第${ep}集`
  if (d.totalEpisodes) return `共${d.totalEpisodes}集`
  return ''
}

export default function DramaDetailClient({
  drama, seasons, related, links, publicAccountImg, tipQRCode, tipButtonText, galleryImages,
}: {
  drama: DramaInfo
  seasons: Array<{ slug: string; title: string; seriesOrder: number }>
  related: RelatedInfo[]
  links: LinkInfo[]
  publicAccountImg: string | null
  tipQRCode: string | null
  tipButtonText: string
  galleryImages?: string[]
}) {
  const [copied, setCopied] = useState(false)
  const [reportedLinks, setReportedLinks] = useState<Set<string>>(new Set())
  const [expandSchedule, setExpandSchedule] = useState(false)
  const [scheduleAnimating, setScheduleAnimating] = useState(false)
  const scheduleImgRef = useRef<HTMLImageElement>(null)
  const [scheduleImgHeight, setScheduleImgHeight] = useState<number | null>(null)
  const [expandEmail, setExpandEmail] = useState<string | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState(reportReasons[0])
  const [reportNote, setReportNote] = useState('')
  const [showTip, setShowTip] = useState(false)
  const [galleryIdx, setGalleryIdx] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [slideDir, setSlideDir] = useState<'left'|'right'|null>(null)
  const [showShare, setShowShare] = useState(false)
  const touchRef = useRef({ startX: 0, startY: 0, dragging: false })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const allImages = [drama.coverImage, ...(galleryImages || [])].filter(Boolean) as string[]
  const maxImg = allImages.length
  const AUTO_INTERVAL = 4000

  const goTo = useCallback((idx: number) => {
    if (maxImg <= 1) return
    const next = ((idx % maxImg) + maxImg) % maxImg
    setSlideDir(next > galleryIdx ? 'right' : 'left')
    setGalleryIdx(next)
    setTimeout(() => setSlideDir(null), 400)
  }, [galleryIdx, maxImg])

  // 自动轮播
  useEffect(() => {
    if (maxImg <= 1) return
    if (isPaused) { if (timerRef.current) clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => {
      setSlideDir('right')
      setGalleryIdx(prev => (prev + 1) % maxImg)
      setTimeout(() => setSlideDir(null), 400)
    }, AUTO_INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPaused, maxImg])

  // 鼠标拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    touchRef.current = { startX: e.clientX, startY: e.clientY, dragging: true }
    setIsPaused(true)
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!touchRef.current.dragging) return
    // 视觉反馈：跟随鼠标微移（可选，保持简洁）
  }
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!touchRef.current.dragging) return
    touchRef.current.dragging = false
    const dx = e.clientX - touchRef.current.startX
    if (Math.abs(dx) > 40) {
      if (dx < 0) goTo(galleryIdx + 1)
      if (dx > 0) goTo(galleryIdx - 1)
    }
    setTimeout(() => setIsPaused(false), 2000)
  }
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaQuestion, setCaptchaQuestion] = useState<string | null>(null)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaError, setCaptchaError] = useState<string | null>(null)
  const [captchaLoading, setCaptchaLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const loadCaptcha = async () => {
    setCaptchaLoading(true)
    setCaptchaError(null)
    setCaptchaAnswer('')
    try {
      const res = await fetch('/api/captcha')
      const data = await res.json()
      setCaptchaToken(data.token)
      setCaptchaQuestion(data.question)
    } catch {
      setCaptchaError('获取验证码失败，请重试')
    }
    setCaptchaLoading(false)
  }
  const epLabel = getEpisodeLabel(drama)
  const showUpcoming = isUpcomingActive(drama)
  const videoPlatform = drama.videoUrl ? getVideoPlatform(drama.videoUrl) : null
  const videoButtonText = drama.videoLabel ? `在线观看${drama.videoLabel}` : '观看预告片'

  const copyText = [
    `【${drama.title || drama.originalTitle}】`,
    ...links.map(l => {
      let line = `${l.platform}：${l.url}`
      if (l.extractCode) line += ` 提取码：${l.extractCode}`
      return line
    }),
  ].join('\n')

  const fallbackCopy = (text: string) => {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.readOnly = true
    ta.style.position = 'fixed'
    ta.style.left = '0'
    ta.style.top = '0'
    ta.style.opacity = '0'
    ta.style.pointerEvents = 'none'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    ta.setSelectionRange(0, 99999)
    try {
      document.execCommand('copy')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 复制失败，静默处理
    }
    document.body.removeChild(ta)
  }

  const handleCopy = () => {
    const doCopy = () => {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(copyText).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }).catch(() => fallbackCopy(copyText))
      } else {
        fallbackCopy(copyText)
      }
    }
    doCopy()
    triggerConfetti()
  }

  const triggerConfetti = () => {
    const colors = ['#D47060','#E89080','#F5E0D8','#FFD700','#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#FFB347','#87CEEB']
    const wh = window.innerHeight
    const ww = window.innerWidth
    for (let i = 0; i < 200; i++) {
      const particle = document.createElement('div')
      const size = Math.random() * 14 + 2
      const ratio = Math.random() * 0.6 + 0.2
      const x = Math.random() * ww
      const y = Math.random() * wh
      const angle = Math.random() * Math.PI * 2
      const velocity = Math.random() * 400 + 60
      const color = colors[Math.floor(Math.random() * colors.length)]
      const rotation = Math.random() * 1440 - 720
      const dur = Math.random() * 1.2 + 0.8

      particle.style.cssText = `
        position: fixed; left: ${x}px; top: ${y}px;
        width: ${size}px; height: ${size * ratio}px;
        background: ${color}; border-radius: ${Math.random() > 0.5 ? '1px' : '3px'};
        pointer-events: none; z-index: 9999;
        opacity: ${Math.random() * 0.4 + 0.6};
        transition: all ${dur}s cubic-bezier(.25,.46,.45,.94);
      `
      document.body.appendChild(particle)

      requestAnimationFrame(() => {
        particle.style.transform = `translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity - Math.random() * 200}px) rotate(${rotation}deg)`
        particle.style.opacity = '0'
      })

      setTimeout(() => particle.remove(), dur * 1000 + 200)
    }
  }

  const handleReportLink = async (linkId: string, platform: string, email?: string) => {
    if (reportedLinks.has(linkId)) return
    if (email && !isValidEmail(email)) {
      setEmailError('请输入正确的邮箱格式')
      return
    }
    if (!captchaToken || !captchaAnswer.trim()) {
      setCaptchaError('请先完成验证码')
      return
    }
    setEmailError(null)
    setCaptchaError(null)
    setSubmitError(null)
    try {
      const res = await fetch('/api/link-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dramaId: drama.id,
          linkId,
          linkPlatform: platform,
          issueType: reportReason,
          note: reportNote.trim() || null,
          email: email || null,
          captchaToken,
          captchaAnswer: captchaAnswer.trim(),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setSubmitError(err.error || '提交失败，请重试')
        // 验证码错误时重新加载
        if (res.status === 400 && err.error === '验证码错误') {
          loadCaptcha()
        }
        return
      }
    } catch {
      setSubmitError('提交失败，请检查网络')
      return
    }
    setReportedLinks(prev => new Set(prev).add(linkId))
    setExpandEmail(null)
    setEmailInput('')
    setReportReason(reportReasons[0])
    setReportNote('')
    setCaptchaToken(null)
    setCaptchaQuestion(null)
    setCaptchaAnswer('')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 上部：封面 + 信息 + 下载 */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* 左栏：封面 + 赞赏 */}
        <div className="w-full md:w-[260px] shrink-0">
          <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[var(--bg-secondary)] shadow-sm select-none cursor-grab active:cursor-grabbing"
            onDragStart={e => e.preventDefault()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={e => { touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, dragging: true }; setIsPaused(true) }}
            onTouchEnd={e => {
              touchRef.current.dragging = false
              const dx = e.changedTouches[0].clientX - touchRef.current.startX
              const dy = e.changedTouches[0].clientY - touchRef.current.startY
              if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                if (dx < 0) goTo(galleryIdx + 1)
                if (dx > 0) goTo(galleryIdx - 1)
              }
              setTimeout(() => setIsPaused(false), 2000)
            }}>
            {/* 图片容器：平移动画 */}
            <div className="relative w-full h-full overflow-hidden">
              {allImages.map((src, i) => (
                <div key={i} className="absolute inset-0 transition-transform duration-400 ease-out"
                  style={{
                    transform: `translateX(${(i - galleryIdx) * 100}%)`,
                    transitionDuration: slideDir ? '400ms' : '0ms',
                  }}>
                  <Image src={src} alt={`${drama.title} ${i + 1}`} fill className="object-cover pointer-events-none" draggable={false}
                    style={{ objectPosition: drama.imagePosition || 'center' }} sizes="(max-width: 768px) 100vw, 400px" />
                </div>
              ))}
              {allImages.length === 0 && (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">暂无封面</div>
              )}
            </div>

            {/* 左右热区 — 鼠标悬停时显示箭头 */}
            {maxImg > 1 && (
              <>
                <div
                  onClick={() => goTo(galleryIdx - 1)}
                  className="group/left absolute left-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer flex items-center justify-start pl-2"
                  style={{ opacity: galleryIdx > 0 ? 1 : 0, pointerEvents: galleryIdx > 0 ? 'auto' : 'none' }}
                >
                  <span className="w-8 h-8 rounded-full bg-black/20 text-white flex items-center justify-center opacity-0 group-hover/left:opacity-100 group-active/left:scale-90 transition-all duration-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </span>
                </div>
                <div
                  onClick={() => goTo(galleryIdx + 1)}
                  className="group/right absolute right-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer flex items-center justify-end pr-2"
                >
                  <span className="w-8 h-8 rounded-full bg-black/20 text-white flex items-center justify-center opacity-0 group-hover/right:opacity-100 group-active/right:scale-90 transition-all duration-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </>
            )}

            {/* 底部小圆点指示器 + 倒计时 */}
            {maxImg > 1 && (
              <div
                className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 px-3 py-1.5 rounded-full bg-black/10 backdrop-blur-sm hover:bg-black/25 transition-all duration-300"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setTimeout(() => setIsPaused(false), 2000)}
              >
                {allImages.map((_, i) => (
                  <button key={i} type="button" onClick={() => goTo(i)}
                    onMouseEnter={() => goTo(i)}
                    className="relative rounded-full transition-all duration-300 hover:scale-150 hover:shadow-[0_0_6px_rgba(255,255,255,0.6)]"
                    style={{
                      width: i === galleryIdx ? '1.25rem' : '0.5rem',
                      height: i === galleryIdx ? '0.5rem' : '0.5rem',
                      backgroundColor: i === galleryIdx ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                    }}>
                    {i === galleryIdx && !isPaused && (
                      <span className="absolute inset-0 rounded-full overflow-hidden">
                        <span className="absolute inset-0 bg-[var(--brand)] rounded-full"
                          style={{ animation: `carouselCountdown ${AUTO_INTERVAL}ms linear infinite` }} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 图片计数 */}
            {maxImg > 1 && (
              <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-black/40 text-white text-[10px]">
                {galleryIdx + 1}/{maxImg}
              </span>
            )}
          </div>
          {tipQRCode && (
            <div className="mt-4 hidden md:flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTip(true)}
                className="w-12 h-12 rounded-full bg-[var(--brand)] text-white flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
                title={tipButtonText}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
              <p className="text-[11px] text-[var(--text-muted)] text-center leading-relaxed">如果您喜欢本站<br />欢迎捐赠支持</p>
            </div>
          )}
        </div>

        {/* 中栏：信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{drama.title || drama.originalTitle}</h1>
            <button
              type="button"
              onClick={() => setShowShare(true)}
              className="shrink-0 mt-1 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-all"
              title="分享"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
              </svg>
              分享
            </button>
          </div>
          {drama.originalTitle && drama.title && (
            <p className="text-sm text-[var(--text-muted)] mb-3">{drama.originalTitle}</p>
          )}

          {/* 季数切换 */}
          {(seasons.length > 0 || (drama.seriesOrder != null && drama.seriesOrder > 0)) && (
            <div className="flex items-center gap-1.5 mb-4">
              {[
                { slug: drama.slug, seriesOrder: drama.seriesOrder || 1, isCurrent: true },
                ...seasons.map(s => ({ ...s, isCurrent: false })),
              ].sort((a, b) => a.seriesOrder - b.seriesOrder).map(s => (
                <Link
                  key={s.slug}
                  href={`/drama/${s.slug}`}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all active:scale-95 ${
                    s.isCurrent
                      ? 'bg-[var(--brand)] text-white'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--brand-pale)] hover:text-[var(--brand)]'
                  }`}
                >
                  第{s.seriesOrder}季
                </Link>
              ))}
            </div>
          )}

          {/* 标签 */}
          <div className="flex flex-wrap gap-2 mb-5">
            {(drama.region || '').split(',').filter(Boolean).map(r => (
              <span key={r} className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)]">{r}</span>
            ))}
            {drama.category === 'movie' && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/90 text-white">电影</span>
            )}
            {drama.category === 'variety' && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-pink-500/90 text-white">综艺</span>
            )}
            {(!drama.category || drama.category === 'tv') && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)]">电视剧</span>
            )}
            {isRecentlyCompleted(drama) && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-500/90 text-white">已完结</span>
            )}
            {(drama.isOnSchedule || isNewlyAiredActive(drama)) && !drama.isCompleted && !showUpcoming && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/90 text-white">追剧中</span>
            )}
            {isNewlyAiredActive(drama) && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/90 text-white">新播</span>
            )}
            {showUpcoming && getUpcomingLabel(drama.expectedDate, drama.expectedPrecision) && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-500/90 text-white">{getUpcomingLabel(drama.expectedDate, drama.expectedPrecision)}</span>
            )}
            {drama.tags && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{drama.tags}</span>
            )}
          </div>

          {/* 详细信息卡片 */}
          {(epLabel || drama.airDays || drama.airTime || drama.startDate) && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
              {epLabel && (
                <div className="flex items-start gap-3">
                  <span className="text-xs text-[var(--text-muted)] w-16 shrink-0 pt-0.5">集数</span>
                  <span className="text-sm text-[var(--text-primary)] font-medium">{epLabel}</span>
                </div>
              )}
              {drama.isCompleted ? (
                drama.startDate && (
                  <div className="flex items-start gap-3">
                    <span className="text-xs text-[var(--text-muted)] w-16 shrink-0 pt-0.5">上映日期</span>
                    <span className="text-sm text-[var(--text-primary)]">
                      {new Date(drama.startDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                )
              ) : (
                <>
                  {drama.airDays && (
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-[var(--text-muted)] w-16 shrink-0 pt-0.5">更新日</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {drama.airDays.split(',').map(d => (
                          <span key={d} className="px-2 py-0.5 rounded text-xs bg-[var(--brand-bg)] text-[var(--brand)] font-medium">
                            {dayNames[parseInt(d)]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {drama.airTime && (
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-[var(--text-muted)] w-16 shrink-0 pt-0.5">更新时间</span>
                      <span className="text-sm text-[var(--text-primary)]">{drama.airTime}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 互动按钮组（追剧 / 收藏 / 预约） */}
          <InteractionBar
            dramaId={drama.id}
            isUpcoming={showUpcoming}
            totalEpisodes={drama.totalEpisodes}
            currentEp={(() => {
              return calcCurrentEpisode({
                currentEpisode: drama.currentEpisode,
                manualEpisode: drama.manualEpisode,
                startDate: drama.startDate,
                premiereEpisodes: drama.premiereEpisodes,
                episodesPerDay: drama.episodesPerDay,
                airDays: drama.airDays,
                airTime: drama.airTime,
              })
            })()}
          />

          {/* 简介 */}
          {drama.description && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">简介</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {drama.description}
              </p>
            </div>
          )}

          {/* 评分 */}
          <RatingSection dramaId={drama.id} />

          {/* 播出日历海报 */}
          {drama.scheduleImage && (
            <div className="mt-6 group">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">播出日历</h3>
              </div>
              <div
                className={`relative bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-secondary)] rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:shadow-[var(--brand)]/10`}
                onClick={() => setExpandSchedule(!expandSchedule)}
              >
                <div className={`overflow-hidden transition-[max-height] duration-500 ease-in-out`}
                  style={{ maxHeight: expandSchedule ? (scheduleImgHeight || 9999) : 200 }}
                  onTransitionEnd={() => setScheduleAnimating(false)}
                >
                  <img
                    ref={scheduleImgRef}
                    src={drama.scheduleImage}
                    alt={`${drama.title} 播出日历`}
                    className="w-full h-auto"
                    onLoad={(e) => {
                    const img = e.currentTarget
                    const ratio = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1
                    setScheduleImgHeight(Math.round(img.offsetWidth * ratio))
                  }}
                  />
                </div>
                {!expandSchedule && !scheduleAnimating && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                )}
                {!expandSchedule && !scheduleAnimating && (
                  <button
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setScheduleAnimating(true); setExpandSchedule(true) }}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/95 text-[var(--brand)] text-xs font-semibold shadow-md backdrop-blur-sm hover:bg-[var(--brand)] hover:text-white transition-all active:scale-95">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    展开播出日历
                  </button>
                )}
                {expandSchedule && !scheduleAnimating && (
                  <button
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setScheduleAnimating(true); setExpandSchedule(false) }}
                    className="absolute top-3 right-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-medium backdrop-blur-sm hover:bg-black/80 transition-all active:scale-95">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                    收起
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 右栏：下载区 */}
        <div className="w-full md:w-[260px] shrink-0">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 sticky top-16">
            {/* 在线观看 */}
            {drama.videoUrl && videoPlatform && (
              <a
                href={drama.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 active:scale-95 transition-all mb-3"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {videoButtonText}
                <span className="text-white/60 text-xs ml-1">@{videoPlatform}</span>
              </a>
            )}

            <h2 className="text-base font-bold text-[var(--text-primary)] text-center mb-1">下载地址</h2>
            <p className="text-[10px] text-[var(--text-muted)] text-center mb-4">资源来源于网络，仅供学习使用</p>

            {links.length > 0 ? (
              <div className="space-y-2 mb-4">
                {links.map(link => {
                  const reported = reportedLinks.has(link.id)
                  const showEmail = expandEmail === link.id
                  return (
                    <div key={link.id}>
                      <div className="flex items-center gap-1">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center gap-2 p-2.5 rounded-lg border border-[var(--border)] hover:border-[var(--brand)] hover:shadow-sm active:scale-[0.98] transition-all min-w-0"
                        >
                          <span className="shrink-0 text-sm font-medium leading-tight text-[var(--text-primary)]">
                            {getPlatformLines(link.platform).map(line => (
                              <span key={line} className="block whitespace-nowrap">{line}</span>
                            ))}
                          </span>
                          {link.extractCode && (
                            <span className="text-[10px] text-[var(--text-muted)] ml-auto">提取码: {link.extractCode}</span>
                          )}
                          <span className="text-xs text-[var(--brand)] ml-auto shrink-0">打开</span>
                        </a>
                        {reported ? (
                          <span className="shrink-0 text-xs text-green-600 font-medium">已反馈</span>
                        ) : showEmail ? (
                          <button
                            type="button"
                            onClick={() => setExpandEmail(null)}
                            className="shrink-0 flex items-center gap-0.5 text-xs text-red-500 px-1 py-1 transition-colors"
                          >
                            <span>⚠</span><span className="hidden sm:inline">问题</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setExpandEmail(link.id); setEmailInput(''); setEmailError(null); setReportReason(reportReasons[0]); setReportNote(''); setSubmitError(null); loadCaptcha() }}
                            className="shrink-0 flex items-center gap-0.5 text-xs text-[var(--text-muted)] hover:text-red-500 px-1 py-1 transition-colors"
                            title="反馈资源问题"
                          >
                            <span>⚠</span><span className="hidden sm:inline">问题</span>
                          </button>
                        )}
                      </div>
                      {showEmail && !reported && (
                        <>
                          <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-2.5 space-y-2">
                            <p className="text-[11px] font-medium text-[var(--text-secondary)]">这个资源有什么问题？</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {reportReasons.map(reason => (
                                <button
                                  key={reason}
                                  type="button"
                                  onClick={() => setReportReason(reason)}
                                  className={`px-2 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                                    reportReason === reason
                                      ? 'border-[var(--brand)] bg-[var(--brand)] text-white'
                                      : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--brand)]'
                                  }`}
                                >
                                  {reason}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              value={reportNote}
                              onChange={e => setReportNote(e.target.value)}
                              placeholder="补充说明，如：缺第8集、文件夹里放错剧（选填）"
                              className="w-full text-base px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
                            />
                          </div>
                          {/* 验证码 */}
                          <div className="mt-1.5">
                            {captchaLoading ? (
                              <div className="text-xs text-[var(--text-muted)] py-1">获取验证码中...</div>
                            ) : captchaQuestion ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-[var(--text-primary)] shrink-0">{captchaQuestion}</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={captchaAnswer}
                                  onChange={e => { setCaptchaAnswer(e.target.value); setCaptchaError(null) }}
                                  placeholder="输入计算结果"
                                  className="flex-1 text-base px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] outline-none focus:border-[var(--brand)] w-20"
                                />
                                <button
                                  type="button"
                                  onClick={loadCaptcha}
                                  className="shrink-0 text-xs text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors"
                                  title="换一个"
                                >
                                  换一个
                                </button>
                              </div>
                            ) : (
                              <div className="text-xs text-red-500 py-1">{captchaError || '验证码加载中...'}</div>
                            )}
                            {captchaError && (
                              <p className="text-[10px] text-red-500 mt-0.5">{captchaError}</p>
                            )}
                          </div>
                        {submitError && (
                          <p className="text-[10px] text-red-500 mt-1.5">{submitError}</p>
                        )}
                        <div className="mt-1.5 flex items-center gap-2">
                            <input
                              type="text"
                              inputMode="email"
                              value={emailInput}
                              onChange={e => { setEmailInput(e.target.value); setEmailError(null) }}
                              placeholder="留邮箱(选填)，修复后通知您"
                              className={`flex-1 text-base px-3 py-1.5 rounded-lg border bg-[var(--bg-card)] text-[var(--text-primary)] outline-none focus:border-[var(--brand)] ${emailError ? 'border-red-400' : 'border-[var(--border)]'}`}
                            />
                            <button
                              type="button"
                              onClick={() => handleReportLink(link.id, link.platform, emailInput || undefined)}
                              className="shrink-0 px-3 py-1.5 rounded-lg bg-[var(--brand)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
                            >
                              提交反馈
                            </button>
                          </div>
                          {emailError && (
                            <p className="text-[10px] text-red-500 mt-1 ml-1">{emailError}</p>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">暂无下载链接</p>
            )}

            {links.length > 0 && (
              <button
                type="button"
                onPointerDown={handleCopy}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-[var(--brand)] text-white hover:opacity-90'
                }`}
              >
                {copied ? '已复制到剪贴板' : '一键复制全部链接'}
              </button>
            )}

            {/* 手机端赞赏入口 */}
            {tipQRCode && (
              <div className="mt-4 pt-4 border-t border-[var(--border)] md:hidden flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTip(true)}
                  className="w-12 h-12 rounded-full bg-[var(--brand)] text-white flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
                  title={tipButtonText}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
                <p className="text-[11px] text-[var(--text-muted)] text-center leading-relaxed">如果您喜欢本站<br />欢迎捐赠支持</p>
              </div>
            )}

            {/* 公众号关注 */}
            {publicAccountImg && (
              <div className="mt-5 pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)] text-center mb-2">扫码关注获取更多资源</p>
                <img src={publicAccountImg} alt="关注公众号" className="w-full rounded-lg" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 赞赏弹窗 */}
      {showTip && tipQRCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowTip(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-sm text-gray-500 text-center mb-4">如果您喜欢本站，欢迎捐赠支持本站哦！</p>
            <img src={tipQRCode} alt="赞赏码" className="w-full rounded-lg" />
            <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">捐赠支持将减轻服务器与加速流量负担，更好的提供优秀资源</p>
            <button
              type="button"
              onClick={() => setShowTip(false)}
              className="w-full mt-4 py-2 rounded-lg bg-gray-100 text-gray-500 text-sm hover:bg-gray-200 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 评论（通栏横条，放在下载区和热门推荐之间） */}
      <div className="max-w-5xl mx-auto mt-10 px-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 md:p-6">
          <CommentSection dramaId={drama.id} />
        </div>
      </div>

      {/* 热门推荐 */}
      {related.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-4 text-center">热门推荐</h2>
          <DramaGrid>
            {related.map(d => (
              <Link key={d.id} href={`/drama/${d.slug}`} className="group">
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[var(--bg-secondary)] shadow-sm group-hover:shadow-md group-hover:-translate-y-1 transition-all duration-200">
                  {d.coverImage ? (
                    <Image src={d.coverImage} alt={d.title} fill className="object-cover" style={{ objectPosition: d.imagePosition || 'center' }} sizes="(max-width: 768px) 50vw, 220px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs">暂无封面</div>
                  )}
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)] mt-1.5 line-clamp-1 group-hover:text-[var(--brand)] transition-colors">
                  {d.title || d.originalTitle}
                </p>
              </Link>
            ))}
          </DramaGrid>
        </div>
      )}

      {/* 分享弹窗 */}
      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        shareData={{
          title: drama.title,
          text: drama.description ? `📺 ${drama.title} ${drama.originalTitle ? `(${drama.originalTitle})` : ''} — ${drama.description.slice(0, 80)}${drama.description.length > 80 ? '...' : ''}` : undefined,
          url: `/drama/${drama.slug}`,
        }}
      />
    </div>
  )
}

// ============ 互动按钮组（收藏 / 追剧 / 预约 / 进度） ============
function InteractionBar({ dramaId, isUpcoming, totalEpisodes, currentEp }: { dramaId: string; isUpcoming?: boolean; totalEpisodes: number | null | undefined; currentEp: number }) {
  const { user } = useAuth()
  const [favorited, setFavorited] = useState(false)
  const [followStatus, setFollowStatus] = useState<'watching' | 'planned' | 'completed' | null>(null)
  const [progress, setProgress] = useState(0)
  const [subscribed, setSubscribed] = useState(false)
  const [subCount, setSubCount] = useState(0)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [progressOpen, setProgressOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // 加载初始状态
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const subsPromise = isUpcoming
      ? fetch(`/api/subscriptions?dramaId=${dramaId}`).then(r => r.json()).catch(() => ({}))
      : Promise.resolve({})
    Promise.all([
      fetch('/api/favorites').then(r => r.json()),
      fetch('/api/following').then(r => r.json()),
      subsPromise,
    ]).then(([favData, follData, subsData]) => {
      if (cancelled) return
      const favIds = new Set((favData.items || []).map((i: { dramaId: string }) => i.dramaId))
      setFavorited(favIds.has(dramaId))
      const item = (follData.items || []).find((i: { dramaId: string }) => i.dramaId === dramaId)
      if (item) {
        setFollowStatus(item.status)
        setProgress(item.progress || 0)
      }
      if (isUpcoming && subsData) {
        setSubscribed(!!subsData.subscribed)
        setSubCount(subsData.count || 0)
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [user, dramaId, isUpcoming])

  // 点击外部关闭
  useEffect(() => {
    if (!statusMenuOpen && !progressOpen) return
    const handler = () => { setStatusMenuOpen(false); setProgressOpen(false) }
    setTimeout(() => document.addEventListener('click', handler, { once: true }), 0)
    return () => document.removeEventListener('click', handler)
  }, [statusMenuOpen, progressOpen])

  const toggleFav = async () => {
    if (!user || loading) return
    setLoading(true)
    const res = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dramaId }),
    })
    const data = await res.json()
    if (data.favorited !== undefined) setFavorited(data.favorited)
    setLoading(false)
  }

  const setFollow = async (status: 'watching' | 'planned' | 'completed' | 'remove') => {
    if (!user || loading) return
    setLoading(true)
    setStatusMenuOpen(false)
    const res = await fetch('/api/following', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dramaId, status }),
    })
    const data = await res.json()
    if (status === 'remove') setFollowStatus(null)
    else if (data.following) setFollowStatus(data.following.status)
    setLoading(false)
  }

  const setEp = async (ep: number) => {
    if (!user || loading) return
    setLoading(true)
    setProgressOpen(false)
    await fetch('/api/following', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dramaId, status: 'watching', progress: ep }),
    })
    setProgress(ep)
    setFollowStatus('watching')
    setLoading(false)
  }

  const toggleSubscribe = async () => {
    if (!user || loading) return
    setLoading(true)
    const res = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dramaId }),
    })
    const data = await res.json()
    if (typeof data.subscribed === 'boolean') setSubscribed(data.subscribed)
    if (typeof data.count === 'number') setSubCount(data.count)
    setLoading(false)
  }

  if (!user) {
    return (
      <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-xs text-[var(--text-muted)] text-center">
        登录后可收藏、想看、追剧{isUpcoming ? '、预约' : ''}、记录看到第几集、分享
      </div>
    )
  }

  return (
    <div className="mt-5 rounded-xl bg-gradient-to-r from-[var(--brand-bg)] to-[var(--brand-grad-to)] border border-[var(--brand-pale)] p-3 flex flex-wrap items-center gap-2">
      {/* 收藏按钮 */}
      <button
        onClick={toggleFav}
        disabled={loading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
          favorited
            ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
            : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand)] hover:text-[var(--brand)]'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
        {favorited ? '已收藏' : '收藏'}
      </button>

      {/* 想看按钮 — 独立入口，所有剧都显示 */}
      <button
        onClick={() => setFollow(followStatus === 'planned' ? 'remove' : 'planned')}
        disabled={loading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
          followStatus === 'planned'
            ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
            : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand)] hover:text-[var(--brand)]'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill={followStatus === 'planned' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
        </svg>
        {followStatus === 'planned' ? '想看 ✓' : '想看'}
      </button>

      {/* 追剧状态按钮（含下拉）— 仅已开播的剧显示 */}
      {!isUpcoming && (
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); if (followStatus) setStatusMenuOpen(!statusMenuOpen); else setFollow('watching') }}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              followStatus
                ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand)] hover:text-[var(--brand)]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M5 4h14l-1 7H6L5 4zM3 4H1m4 0v14a1 1 0 001 1h12a1 1 0 001-1V4M9 11h6"/>
            </svg>
            {followStatus === 'watching' ? '追剧中' : followStatus === 'completed' ? '已看完' : '追剧'}
            {followStatus && (
              <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
            )}
          </button>
          {statusMenuOpen && followStatus && (
            <div className="absolute left-0 top-full mt-1 z-20 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-[120px]">
              <button onClick={() => setFollow('watching')} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-secondary)] ${followStatus === 'watching' ? 'text-[var(--brand)] font-semibold' : 'text-[var(--text-secondary)]'}`}>
                追剧中
                {followStatus === 'watching' && <span className="ml-1">✓</span>}
              </button>
              <button onClick={() => setFollow('completed')} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-secondary)] ${followStatus === 'completed' ? 'text-[var(--brand)] font-semibold' : 'text-[var(--text-secondary)]'}`}>
                标记已看完
                {followStatus === 'completed' && <span className="ml-1">✓</span>}
              </button>
              <div className="h-px bg-[var(--border)] my-1" />
              <button onClick={() => setFollow('remove')} className="w-full text-left px-3 py-1.5 text-xs text-[var(--danger)] hover:bg-[var(--danger-bg)]">
                取消追剧
              </button>
            </div>
          )}
        </div>
      )}

      {/* 预约按钮 — 仅未上映的剧显示 */}
      {isUpcoming && (
        <button
          onClick={toggleSubscribe}
          disabled={loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            subscribed
              ? 'bg-[var(--warning)] text-white border-[var(--warning)]'
              : 'bg-[var(--bg-card)] text-[var(--warning)] border-[var(--warning-border)] hover:border-[var(--warning)]'
          }`}
          title={subscribed ? '再次点击取消预约' : '点击预约，开播时通知你'}
        >
          <svg className="w-3.5 h-3.5" fill={subscribed ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {subscribed ? '已预约' : '预约上线'}
          {subCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
              subscribed ? 'bg-white/25 text-white' : 'bg-[var(--warning-bg)] text-[var(--warning)]'
            }`}>
              {subCount} 人
            </span>
          )}
        </button>
      )}

      {/* 进度标记按钮 — 已开播且有总集数时显示 */}
      {!isUpcoming && totalEpisodes && totalEpisodes > 0 && (
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setProgressOpen(!progressOpen) }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            看到 EP {progress || 1}
          </button>
          {progressOpen && (
            <div className="absolute left-0 top-full mt-1 z-20 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg p-2 min-w-[160px]">
              <p className="text-[10px] text-[var(--text-muted)] mb-1.5">标记看到第几集（自动追剧）</p>
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map(ep => (
                  <button
                    key={ep}
                    onClick={() => setEp(ep)}
                    className={`text-xs py-1 rounded ${
                      ep === (progress || 1)
                        ? 'bg-[var(--brand)] text-white font-semibold'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--brand-pale)] hover:text-[var(--brand)]'
                    }`}
                  >
                    {ep}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 提示文字 — 追剧中有新集 */}
      {!isUpcoming && followStatus === 'watching' && currentEp > (progress || 0) && (
        <span className="text-[10px] text-[var(--danger)] font-medium ml-auto flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)] animate-pulse" />
          有新集 (EP {currentEp})
        </span>
      )}

      {/* 提示文字 — 预约人数 */}
      {isUpcoming && subCount > 0 && !subscribed && (
        <span className="text-[10px] text-[var(--warning)] font-medium ml-auto">
          已有 {subCount} 人预约
        </span>
      )}

    </div>
  )
}

// ============ 评分组件（星级评分 1-5 → 10 分制显示） ============
function RatingSection({ dramaId }: { dramaId: string }) {
  const { user } = useAuth()
  const loadIdRef = useRef(0) // 防并发覆盖
  const [avgRating, setAvgRating] = useState(0)
  const [tenPointScore, setTenPointScore] = useState(0)
  const [count, setCount] = useState(0)
  const [distribution, setDistribution] = useState([0, 0, 0, 0, 0])
  const [myScore, setMyScore] = useState<number | null>(null)
  const [showScore, setShowScore] = useState(false)
  const [hoverScore, setHoverScore] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = (force = false) => {
    const id = ++loadIdRef.current
    if (!force) setLoading(true)
    fetch(`/api/ratings?dramaId=${dramaId}`)
      .then(r => r.json())
      .then(data => {
        if (loadIdRef.current !== id) return // 被更新的请求覆盖，丢弃
        setAvgRating(data.avgRating || 0)
        setTenPointScore(data.tenPointScore || 0)
        setCount(data.count || 0)
        setDistribution(data.distribution || [0, 0, 0, 0, 0])
        setMyScore(data.myRating || null)
        setShowScore(!!data.showScore)
      })
      .catch(() => {})
      .finally(() => {
        if (loadIdRef.current === id) setLoading(false)
      })
  }

  useEffect(() => { load() }, [dramaId])

  const rate = async (score: number) => {
    if (!user) return
    await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dramaId, score }),
    })
    setMyScore(score)
    load(true) // force = true 不闪 loading
  }

  // 百分比计算
  const pcts = count > 0
    ? distribution.map(c => Math.round((c / count) * 100))
    : [0, 0, 0, 0, 0]
  const maxPct = Math.max(...pcts, 1)

  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
        <span className="w-6 h-6 rounded-md bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)]">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </span>
        评分
      </h3>
      <div className="bg-[var(--bg-card)] border border-[var(--brand-pale)] rounded-xl p-4">
        <div className="flex items-start gap-6 flex-wrap">
          {/* 左侧：10分制的大数字 / 收集中状态 */}
          <div className="text-center shrink-0 min-w-[80px]">
            {showScore ? (
              <>
                <div className="text-3xl font-bold text-[var(--text-primary)]">
                  {tenPointScore}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{count} 人评价</div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-2">
                <div className="text-3xl font-bold text-[var(--text-muted)]">—</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1">评价收集中</div>
                {count > 0 && (
                  <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{count} 人已评</div>
                )}
              </div>
            )}
          </div>

          {/* 中间：可点击的星星 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-0.5 mb-1">
              {[1, 2, 3, 4, 5].map(star => {
                const displayScore = hoverScore > 0 ? hoverScore : avgRating
                const filled = displayScore >= star - 0.25
                const half = !filled && displayScore >= star - 0.75
                return (
                  <button
                    key={star}
                    onClick={() => rate(star)}
                    onMouseEnter={() => user && !myScore && setHoverScore(star)}
                    onMouseLeave={() => setHoverScore(0)}
                    className={`text-lg transition-all duration-150 ${user ? 'cursor-pointer hover:scale-125' : 'cursor-default'} ${
                      filled || half ? 'text-[#FFB940]' : 'text-[var(--border)]'
                    }`}
                    title={user ? `评 ${star} 星` : '登录后可评分'}
                  >
                    {half ? '★' : filled ? '★' : '☆'}
                  </button>
                )
              })}
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">
              {user
                ? (myScore ? `你评了 ${myScore} 星 · 点击可修改` : '点击星星评分')
                : '登录后可评分'}
            </div>
          </div>

          {/* 右侧：分布图（百分比显示） */}
          {count > 0 && (
            <div className="min-w-[100px] space-y-0.5">
              {pcts.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                  <span className="w-3 shrink-0">{i + 1}</span>
                  <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#FFB940] transition-all"
                      style={{ width: `${(p / maxPct) * 100}%` }}
                    />
                  </div>
                  <span className="w-7 text-right">{p}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ 评论区组件 ============
interface CommentItem {
  id: string
  content: string
  createdAt: string
  isMine: boolean
  isAdmin: boolean
  user: { username: string; avatar: string | null }
  likeCount: number
  replyCount: number
  pinned: boolean
  liked: boolean
  parentId?: string | null
  replyToUser?: string | null
  replies?: CommentItem[]
}

function CommentSection({ dramaId }: { dramaId: string }) {
  const { user, isAdmin } = useAuth()
  const [comments, setComments] = useState<CommentItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [moderationMsg, setModerationMsg] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null)
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [showAllComments, setShowAllComments] = useState(false)
  const COMMENTS_PER_PAGE_DISPLAY = 20  // 一页展示的评论数（>20折叠）
  const REPLIES_PREVIEW = 1              // 每条评论默认展开的回复数

  const load = (p = page) => {
    fetch(`/api/comments?dramaId=${dramaId}&page=${p}&limit=10`)
      .then(r => r.json())
      .then(data => {
        setComments(data.items || [])
        setTotal(data.total || 0)
        setPage(data.page || 1)
        setTotalPages(data.totalPages || 1)
      })
      .catch(() => {})
  }

  useEffect(() => { load(1) }, [dramaId])

  const submit = async () => {
    if (!user || !input.trim() || submitting) return
    setSubmitting(true)
    const body: Record<string, unknown> = { dramaId, content: input.trim() }
    if (replyTo) {
      body.parentId = replyTo.id
      body.replyToUser = replyTo.username
    }
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSubmitting(false)
    if (data.ok) {
      setInput('')
      setReplyTo(null)
      if (data.moderated) {
        setModerationMsg(data.message || '评论已提交审核')
        setTimeout(() => setModerationMsg(''), 5000)
      }
      load(1)
    }
  }

  const remove = async (id: string) => {
    setDeleting(id)
    try {
      const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        console.error('删除失败:', err.error || res.status)
        return
      }
      load(page > 1 ? page : 1)
    } catch (e) {
      console.error('删除请求异常:', e)
    } finally {
      setDeleting(null)
    }
  }

  const toggleLike = async (commentId: string) => {
    if (!user) return
    // 乐观更新
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, liked: !c.liked, likeCount: c.likeCount + (c.liked ? -1 : 1) }
      }
      // 同时更新嵌套回复
      if (c.replies) {
        return { ...c, replies: c.replies.map(r => r.id === commentId ? { ...r, liked: !r.liked, likeCount: r.likeCount + (r.liked ? -1 : 1) } : r) }
      }
      return c
    }))
    try {
      const res = await fetch(`/api/comments/${commentId}/like`, { method: 'POST' })
      if (!res.ok) throw new Error()
    } catch {
      // 回滚
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return { ...c, liked: !c.liked, likeCount: c.likeCount + (c.liked ? -1 : 1) }
        }
        if (c.replies) {
          return { ...c, replies: c.replies.map(r => r.id === commentId ? { ...r, liked: !r.liked, likeCount: r.likeCount + (r.liked ? -1 : 1) } : r) }
        }
        return c
      }))
    }
  }

  const togglePin = async (commentId: string) => {
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, pinned: !c.pinned } : c))
    try {
      const res = await fetch(`/api/comments/${commentId}/pin`, { method: 'POST' })
      if (!res.ok) throw new Error()
    } catch {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, pinned: !c.pinned } : c))
    }
  }

  const renderComment = (c: CommentItem, isReply = false) => (
    <div key={c.id} className={`flex gap-2.5 p-3 rounded-lg ${c.pinned ? 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200' : 'bg-[var(--bg-secondary)]'}`}>
      <div className="relative w-8 h-8 rounded-full shrink-0 bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)] text-xs font-bold">
        {c.user.avatar ? (
          <img src={c.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          c.user.username.slice(0, 1)
        )}
        {c.isAdmin && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#FFD700] flex items-center justify-center shadow-sm border-[1.5px] border-[var(--bg-secondary)]"
            title="管理员">
            <svg className="w-2 h-2" viewBox="0 0 24 24" fill="#B8860B">
              <path d="M12 2L15.09 8.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z"/>
            </svg>
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {/* 第一行：用户名 + 时间 + 我的 + 操作按钮 */}
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-xs font-medium text-[var(--text-primary)]">{c.user.username}</span>
          {c.pinned && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-bold" title="管理员精选置顶">
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>
              精选
            </span>
          )}
          <span className="text-[9px] text-[var(--text-muted)]">{timeAgoStr(c.createdAt)}</span>
          {c.isMine && <span className="text-[9px] text-[var(--brand)] font-medium">我的</span>}

          {/* 点赞按钮 */}
          <button
            onClick={() => toggleLike(c.id)}
            disabled={!user}
            title={c.liked ? '取消点赞' : '点赞'}
            className={`ml-2 flex items-center gap-0.5 text-[11px] transition-colors px-1.5 py-0.5 rounded ${
              c.liked ? 'text-[var(--brand)] bg-[var(--brand-bg)]' : 'text-[var(--text-muted)] hover:text-[var(--brand)] hover:bg-[var(--bg)]'
            } disabled:cursor-not-allowed`}
          >
            <svg className={`w-3.5 h-3.5 ${c.liked ? 'scale-110' : ''}`} fill={c.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            {c.likeCount > 0 && <span>{c.likeCount}</span>}
          </button>

          {/* 回复按钮（顶级评论才显示） */}
          {!isReply && user && (
            <button
              onClick={() => setReplyTo({ id: c.id, username: c.user.username })}
              title="回复"
              className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--brand)] hover:bg-[var(--bg)] px-1.5 py-0.5 rounded transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4"/>
              </svg>
              <span>回复</span>
              {c.replyCount > 0 && <span>({c.replyCount})</span>}
            </button>
          )}

          {/* 精选按钮（仅管理员） */}
          {isAdmin && !isReply && (
            <button
              onClick={() => togglePin(c.id)}
              title={c.pinned ? '已置顶，点击取消' : '精选置顶'}
              className={`flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded transition-colors ${
                c.pinned ? 'text-white bg-amber-500' : 'text-[var(--text-muted)] hover:text-amber-600 hover:bg-[var(--bg)]'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill={c.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z"/>
              </svg>
            </button>
          )}

          {/* 删除按钮（右对齐） */}
          {(c.isMine || isAdmin) && (
            <button
              onClick={() => remove(c.id)}
              disabled={deleting === c.id}
              className="ml-auto text-[10px] text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
            >
              {deleting === c.id ? '删除中...' : isAdmin && !c.isMine ? '管理员删除' : '删除'}
            </button>
          )}
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap break-words">{c.content}</p>
      </div>
    </div>
  )

  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
        <span className="w-6 h-6 rounded-md bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)]">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        </span>
        评论{total > 0 ? ` (${total})` : ''}
      </h3>

      {/* 审核提示 */}
      {moderationMsg && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs">
          {moderationMsg}
        </div>
      )}

      {/* 输入框 */}
      {user ? (
        <div className="mb-4">
          {replyTo && (
            <div className="flex items-center gap-2 mb-1.5 px-3 py-1.5 rounded-t-lg bg-[var(--brand-bg)] border border-[var(--brand-pale)] border-b-0 text-xs">
              <span className="text-[var(--text-secondary)]">回复 <span className="text-[var(--brand)] font-medium">@{replyTo.username}</span></span>
              <button onClick={() => setReplyTo(null)} className="ml-auto text-[var(--text-muted)] hover:text-[var(--danger)]">✕</button>
            </div>
          )}
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            maxLength={500}
            placeholder={replyTo ? `回复 @${replyTo.username}...` : '写下你对这部剧的短评...'}
            rows={2}
            className={`w-full text-sm px-3 py-2 border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] outline-none focus:border-[var(--brand)] resize-none ${replyTo ? 'rounded-b-lg' : 'rounded-lg'}`}
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-[var(--text-muted)]">{input.length}/500</span>
            <button
              onClick={submit}
              disabled={!input.trim() || submitting}
              className="px-4 py-1.5 rounded-full bg-[var(--brand)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? '发表中...' : (replyTo ? '回复' : '发表')}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-center text-xs text-[var(--text-muted)]">
          登录后即可发表评论
        </div>
      )}

      {/* 评论列表 */}
      {comments.length === 0 ? (
        <p className="py-6 text-center text-xs text-[var(--text-muted)]">还没有评论，来写第一条吧</p>
      ) : (
        <div className="space-y-3">
          {(showAllComments ? comments : comments.slice(0, COMMENTS_PER_PAGE_DISPLAY)).map(c => {
            const replies = c.replies || []
            const showReplies = expandedReplies.has(c.id)
            const visibleReplies = showReplies ? replies : replies.slice(0, REPLIES_PREVIEW)
            const hiddenRepliesCount = replies.length - visibleReplies.length
            return (
              <div key={c.id} className="space-y-2">
                {renderComment(c)}
                {/* 嵌套回复 */}
                {replies.length > 0 && (
                  <div className="ml-10 pl-3 border-l-2 border-[var(--brand-pale)] space-y-2">
                    {visibleReplies.map(r => renderComment(r, true))}
                    {/* 折叠按钮：回复 > 1 条 */}
                    {hiddenRepliesCount > 0 && (
                      <button
                        onClick={() => setExpandedReplies(prev => {
                          const next = new Set(prev)
                          next.add(c.id)
                          return next
                        })}
                        className="ml-2 text-[11px] text-[var(--brand)] hover:underline flex items-center gap-0.5"
                      >
                        共 {replies.length} 条回复 ▾
                      </button>
                    )}
                    {showReplies && replies.length > REPLIES_PREVIEW && (
                      <button
                        onClick={() => setExpandedReplies(prev => {
                          const next = new Set(prev)
                          next.delete(c.id)
                          return next
                        })}
                        className="ml-2 text-[11px] text-[var(--text-muted)] hover:text-[var(--brand)] hover:underline flex items-center gap-0.5"
                      >
                        收起 ▴
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {/* 评论总数折叠：超过 20 条 */}
          {!showAllComments && comments.length > COMMENTS_PER_PAGE_DISPLAY && (
            <button
              onClick={() => setShowAllComments(true)}
              className="w-full py-2.5 text-xs text-[var(--brand)] hover:bg-[var(--brand-bg)] rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              还有 {total - COMMENTS_PER_PAGE_DISPLAY} 条评论 ▾
            </button>
          )}
          {showAllComments && comments.length > COMMENTS_PER_PAGE_DISPLAY && (
            <button
              onClick={() => setShowAllComments(false)}
              className="w-full py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--brand)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              收起评论 ▴
            </button>
          )}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => load(p)}
              className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                p === page
                  ? 'bg-[var(--brand)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--brand-pale)] hover:text-[var(--brand)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function timeAgoStr(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 天前`
  return `${Math.floor(day / 30)} 个月前`
}
