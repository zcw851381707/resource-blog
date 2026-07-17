'use client'

import { useEffect, useState } from 'react'

interface CelebrationDrama {
  id: string
  title: string
  slug: string
  coverImage?: string | null
  totalEpisodes?: number | null
  progress: number
  createdAt: string  // 追剧开始时间
  completedAt: string // 完成时间
  partnerCount: number // 追剧伙伴数
}

interface Props {
  drama: CelebrationDrama | null
  onClose: () => void
}

// 完结仪式弹窗
// 用户把一部剧切到"已看完"时触发
export default function CompletionCelebration({ drama, onClose }: Props) {
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    if (drama) {
      // 触发动画
      setTimeout(() => setAnimate(true), 50)
    } else {
      setAnimate(false)
    }
  }, [drama])

  if (!drama) return null

  // 计算追剧时长（天）
  const start = new Date(drama.createdAt)
  const end = new Date(drama.completedAt)
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))

  // 总集数
  const totalEps = drama.totalEpisodes || drama.progress
  const avgPerDay = (drama.progress / days).toFixed(1)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${animate ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div
        className={`relative bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-secondary)] rounded-2xl shadow-2xl max-w-sm w-full p-6 transition-all duration-300 ${animate ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 主标题 */}
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-[var(--brand-pale)] to-[var(--brand)] flex items-center justify-center shadow-lg">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            恭喜你看完了
          </h2>
          <p className="text-lg font-semibold mt-1" style={{ color: 'var(--brand)' }}>
            《{drama.title}》!
          </p>
        </div>

        {/* 统计 */}
        <div className="bg-[var(--bg)] rounded-xl p-4 mb-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">追剧时长</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">{days} 天</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">共追了</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">{drama.progress} 集</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">平均每天</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">{avgPerDay} 集</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">同追伙伴</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">{drama.partnerCount} 人</span>
          </div>
        </div>

        {/* 成就徽章 */}
        <div className="bg-gradient-to-r from-[var(--brand-pale)] to-transparent rounded-xl p-3 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs text-[var(--text-muted)]">获得成就</p>
            <p className="text-sm font-bold text-[var(--brand)]">完结撒花</p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              // 跳到剧详情页的评论区
              window.location.href = `/drama/${drama.slug}#comments`
            }}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 active:scale-95 transition-all"
          >
            写观后感
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg)] transition-colors"
          >
            稍后再说
          </button>
        </div>
      </div>
    </div>
  )
}