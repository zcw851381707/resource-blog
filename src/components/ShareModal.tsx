'use client'

import { useState, useEffect, useRef } from 'react'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  shareData: {
    title: string
    text?: string
    url: string
  }
}

type GuideType = 'add-to-home' | 'save-page' | null

export default function ShareModal({
  isOpen,
  onClose,
  shareData,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [guide, setGuide] = useState<GuideType>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const isMobile = typeof window !== 'undefined' && typeof navigator !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  // 锁定 body 滚动
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [isOpen])

  // 关闭时重置
  useEffect(() => {
    if (!isOpen) setTimeout(() => setGuide(null), 200)
  }, [isOpen])

  const handleCopyLink = async () => {
    const fullUrl = window.location.origin + shareData.url
    const text = shareData.text ? `${shareData.title}\n${shareData.text}\n${fullUrl}` : `${shareData.title}\n${fullUrl}`
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        fallbackCopy(text)
      }
    } catch {
      fallbackCopy(text)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

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
    try { document.execCommand('copy') } catch { /* 静默 */ }
    document.body.removeChild(ta)
  }

  const handleWebShare = async () => {
    const fullUrl = window.location.origin + shareData.url
    try {
      await navigator.share({
        title: shareData.title,
        text: shareData.text || shareData.title,
        url: fullUrl,
      })
      onClose()
    } catch {
      // 用户取消或无权限，忽略
    }
  }

  const handleSavePage = () => {
    window.print()
  }

  const canShare = typeof navigator !== 'undefined' && !!navigator.share
  const isIOS = typeof window !== 'undefined' && typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isChrome = typeof window !== 'undefined' && typeof navigator !== 'undefined' && /chrome/i.test(navigator.userAgent) && !/edge/i.test(navigator.userAgent)
  const isWechat = typeof window !== 'undefined' && typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent)

  if (!isOpen) return null

  // 引导指南视图
  if (guide === 'add-to-home') {
    return (
      <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === overlayRef.current) onClose() }}>
        <div className="w-full max-w-sm bg-white dark:bg-[#241e28] rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">添加到桌面</h3>
            <button onClick={() => setGuide(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-5 pb-5 pt-2 space-y-4">
            {isWechat ? (
              <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
                <p>1. 点击右上角 <strong>「···」</strong></p>
                <p>2. 选择 <strong>「收藏」</strong></p>
                <p className="text-xs text-gray-400 pt-2">微信内不支持直接添加到桌面，收藏后可在微信收藏中快速访问</p>
              </div>
            ) : isIOS ? (
              <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
                <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0">1</span> 点底部 <strong>「···」</strong> → <strong>「共享」</strong></p>
                <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0">2</span> 向下滑动，点击 <strong>「添加到主屏幕」</strong> <span className="text-lg">🏠</span></p>
                <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0">3</span> 点右上角 <strong>「添加」</strong></p>
              </div>
            ) : isChrome ? (
              <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
                <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0">1</span> 点右上角 <strong>「···」</strong></p>
                <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0">2</span> 选 <strong>「添加到主屏幕」</strong> <span className="text-lg">🏠</span></p>
                <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0">3</span> 点 <strong>「添加」</strong></p>
              </div>
            ) : (
              <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
                <p>在浏览器菜单中找到 <strong>「添加到主屏幕」</strong> 或 <strong>「添加至桌面」</strong> 选项</p>
              </div>
            )}
            <button onClick={onClose} className="w-full mt-2 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              知道了
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (guide === 'save-page') {
    return (
      <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === overlayRef.current) onClose() }}>
        <div className="w-full max-w-sm bg-white dark:bg-[#241e28] rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">保存网页</h3>
            <button onClick={() => setGuide(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-5 pb-5 pt-2 space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
              <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0">1</span> 按键盘 <kbd className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs font-mono">Ctrl + D</kbd> <span className="text-xs text-gray-400">(Mac: <kbd className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs font-mono">⌘ + D</kbd>)</span></p>
              <p className="text-xs text-gray-400 pl-9">将本站添加至浏览器书签</p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-600" /></div>
              <div className="relative flex justify-center"><span className="px-2 bg-white dark:bg-[#241e28] text-xs text-gray-400">或者</span></div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
              <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0">1</span> 点击 <strong>「打印」</strong>，选择「另存为 PDF」</p>
            </div>
            <button onClick={handleSavePage} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[var(--brand)] text-white hover:opacity-90 active:scale-[0.98] transition-all">
              打开打印 / 保存为 PDF
            </button>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              知道了
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 主菜单视图
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-[#241e28] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">分享</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 选项列表 */}
        <div className="px-5 pb-5 pt-2 space-y-2">
          {/* 复制链接 */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-[0.98] transition-all text-left"
          >
            <span className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
              {copied ? (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              )}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {copied ? '已复制!' : '复制链接'}
            </span>
          </button>

          {/* 分享到其他应用（Web Share API） */}
          {canShare && (
            <button
              onClick={handleWebShare}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-[0.98] transition-all text-left"
            >
              <span className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">分享到其他应用</span>
            </button>
          )}

          {/* 添加到桌面（移动端） / 保存网页（PC端） */}
          {isMobile ? (
            <button
              onClick={() => setGuide('add-to-home')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-[0.98] transition-all text-left"
            >
              <span className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18v-5m0 0a3 3 0 003-3V7a3 3 0 10-6 0v3a3 3 0 003 3zm0 0H8m4 0h4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
                </svg>
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">添加到桌面</span>
            </button>
          ) : (
            <button
              onClick={() => setGuide('save-page')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-[0.98] transition-all text-left"
            >
              <span className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">保存网页</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
