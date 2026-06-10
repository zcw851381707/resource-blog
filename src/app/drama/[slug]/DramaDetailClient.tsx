'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import DramaGrid from '@/components/DramaGrid'
import ShareModal from '@/components/ShareModal'

interface DramaInfo {
  id: string
  title: string
  slug: string
  coverImage?: string | null
  region?: string | null
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
    // 有完结日期且完结不满一个月 → "已完结，共X集"
    if (d.completedAt) {
      const completedDate = new Date(d.completedAt)
      const oneMonthLater = new Date(completedDate)
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)
      if (new Date() < oneMonthLater) {
        if (d.totalEpisodes) return `已完结，共${d.totalEpisodes}集`
        return '已完结'
      }
    }
    // 完结满一个月或无完结日期 → "全X集"
    if (d.totalEpisodes) return `全${d.totalEpisodes}集`
    return '已完结'
  }
  const ep = d.manualEpisode ?? d.currentEpisode
  if (ep && d.totalEpisodes) return `更新至第${ep}集，共${d.totalEpisodes}集`
  if (ep) return `更新至第${ep}集`
  if (d.totalEpisodes) return `全${d.totalEpisodes}集`
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
  const videoPlatform = drama.videoUrl ? getVideoPlatform(drama.videoUrl) : null
  const videoButtonText = drama.videoLabel ? `在线观看${drama.videoLabel}` : '观看预告片'

  const copyText = [
    `【${drama.title}】`,
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
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{drama.title}</h1>
            <button
              type="button"
              onClick={() => setShowShare(true)}
              className="shrink-0 mt-1 w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--bg-secondary)] active:scale-90 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              title="分享"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
          {drama.originalTitle && (
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
            {drama.isCompleted && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-500/90 text-white">已完结</span>
            )}
            {drama.isOnSchedule && !drama.isCompleted && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/90 text-white">追剧中</span>
            )}
            {drama.isNewlyAired && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/90 text-white">新播</span>
            )}
            {drama.isUpcoming && getUpcomingLabel(drama.expectedDate, drama.expectedPrecision) && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-500/90 text-white">{getUpcomingLabel(drama.expectedDate, drama.expectedPrecision)}</span>
            )}
            {drama.tags && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{drama.tags}</span>
            )}
          </div>

          {/* 详细信息卡片 */}
          {(epLabel || drama.airDays || drama.airTime) && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
              {epLabel && (
                <div className="flex items-start gap-3">
                  <span className="text-xs text-[var(--text-muted)] w-16 shrink-0 pt-0.5">集数</span>
                  <span className="text-sm text-[var(--text-primary)] font-medium">{epLabel}</span>
                </div>
              )}
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
            </div>
          )}

          {/* 简介 */}
          {drama.description && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">简介</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {drama.description}
              </p>
            </div>
          )}

          {/* 播出日历海报 */}
          {drama.scheduleImage && (
            <div className="mt-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <img
                src={drama.scheduleImage}
                alt={`${drama.title} 播出日历`}
                className={`w-full cursor-pointer ${expandSchedule ? 'object-contain' : 'max-h-[180px] object-cover'}`}
                onClick={() => setExpandSchedule(!expandSchedule)}
              />
              {!expandSchedule && (
                <p className="text-xs text-[var(--text-muted)] text-center py-1.5 cursor-pointer hover:text-[var(--brand)] transition-colors" onClick={() => setExpandSchedule(true)}>展开播出日历 ↓</p>
              )}
              {expandSchedule && (
                <p className="text-xs text-[var(--text-muted)] text-center py-1.5 cursor-pointer hover:text-[var(--brand)] transition-colors" onClick={() => setExpandSchedule(false)}>收起 ↑</p>
              )}
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
                  {d.title}
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
