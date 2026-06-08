'use client'

import Image from 'next/image'
import Link from 'next/link'

interface DramaCardProps {
  id: string
  title: string
  slug: string
  coverImage?: string | null
  region?: string | null
  isNewlyAired?: boolean
  isUpcoming?: boolean
  expectedDate?: Date | string | null
  expectedPrecision?: string | null
  airTime?: string | null
  airDays?: string | null
  imagePosition?: string | null
  isCompleted?: boolean
  totalEpisodes?: number | null
  currentEpisode?: number | null
  manualEpisode?: number | null
  startDate?: Date | string | null
  completedAt?: Date | string | null
  isOnSchedule?: boolean
  tags?: string | null
  seriesGroup?: string | null
  seriesOrder?: number | null
}

function getEpisodeLabel(drama: DramaCardProps): string | null {
  if (drama.isCompleted) return '已完结'
  const ep = drama.manualEpisode ?? drama.currentEpisode
  if (ep && drama.totalEpisodes) return `第${ep}集/共${drama.totalEpisodes}集`
  if (ep) return `第${ep}集`
  if (drama.totalEpisodes) return `共${drama.totalEpisodes}集`
  return null
}

function getUpcomingLabel(drama: DramaCardProps): { text: string; suffix: string } | null {
  if (!drama.expectedDate) return { text: '敬请期待', suffix: '' }
  const d = new Date(drama.expectedDate)
  const precision = drama.expectedPrecision || 'day'
  if (precision === 'year') return { text: `${d.getFullYear()}年`, suffix: '开播' }
  if (precision === 'month') return { text: `${d.getMonth() + 1}月`, suffix: '开播' }
  const dateStr = `${d.getMonth() + 1}月${d.getDate()}日`
  const text = drama.airTime ? `${dateStr} ${drama.airTime}` : dateStr
  return { text, suffix: '开播' }
}


export default function DramaCard({ drama }: { drama: DramaCardProps }) {
  const href = `/drama/${drama.slug}`

  const handleClick = (e: React.MouseEvent) => {
    if (window.innerWidth >= 768) {
      e.preventDefault()
      window.open(href, '_blank', 'noopener,noreferrer')
    }
  }

  // 首播日当天不再显示「预计上线」，改为显示第 1 集（已脱离即将上线状态的才算首播）
  const isPremiered = drama.expectedDate && !drama.isUpcoming && (() => {
    const d = new Date(drama.expectedDate)
    d.setHours(0, 0, 0, 0)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now >= d
  })()
  // 首播标签：进入首播周后整周显示，不限于首播日当天
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
  const epLabel = isPremiered && !drama.isCompleted ? '第1集' : getEpisodeLabel(drama)
  const upcomingLabelData = isPremiered ? null : getUpcomingLabel(drama)
  const showNewlyAired = drama.isNewlyAired && (
    !drama.isCompleted ||
    (drama.completedAt && (() => {
      const completed = new Date(drama.completedAt)
      const diffMs = Date.now() - completed.getTime()
      return diffMs >= 0 && diffMs <= 60 * 24 * 60 * 60 * 1000
    })())
  )

  return (
    <Link href={href} className="group block" onClick={handleClick}>
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[var(--bg-secondary)] shadow-sm group-hover:shadow-md group-hover:-translate-y-1 active:scale-[0.97] transition-all duration-200">
        {drama.coverImage ? (
          <Image src={drama.coverImage} alt={drama.title} fill className="object-cover" style={{ objectPosition: drama.imagePosition || 'center' }} sizes="(max-width: 768px) 50vw, (max-width: 1024px) 240px, 300px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs">
            暂无封面
          </div>
        )}

        {/* 标签 — 横向排列 */}
        <div className="absolute top-1.5 right-1.5 flex flex-row flex-wrap gap-1 justify-end">
          {drama.tags && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-500/90 text-white">{drama.tags}</span>
          )}
          {drama.isCompleted && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-500/90 text-white">已完结</span>
          )}
          {showNewlyAired && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-500/90 text-white">新播</span>
          )}
          {drama.isUpcoming && upcomingLabelData && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-orange-500/90 text-white">{upcomingLabelData.text}{upcomingLabelData.suffix}</span>
          )}
          {isPremiereDay && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-pink-500/90 text-white">首播</span>
          )}
          {drama.isOnSchedule && !drama.isCompleted && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-500/90 text-white">追剧中</span>
          )}
        </div>

        {/* 集数进度 */}
        {epLabel && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
            <span className="text-[10px] text-white/90">{epLabel}</span>
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-[var(--text-primary)] mt-1.5 line-clamp-1 group-hover:text-[var(--brand)] transition-colors min-h-[20px]">
        {drama.title}{(drama.seriesOrder ?? 0) > 0 && ` 第${drama.seriesOrder}季`}
      </p>
      <p className="text-xs text-[var(--text-muted)] mt-0.5 min-h-[16px] group-hover:text-[var(--brand)] transition-colors">
        {drama.airTime && drama.isOnSchedule ? (
          <>
            {drama.airDays && (() => {
              const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
              const days = drama.airDays.split(',').map(d => dayNames[parseInt(d)] || '').filter(Boolean)
              return days.length > 0 ? days.join('、') + ' ' : ''
            })()}
            {drama.airTime}
          </>
        ) : ' '}
      </p>
    </Link>
  )
}
