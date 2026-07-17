'use client'

import React, { useEffect, useState } from 'react'

interface DayData {
  count: number
  episodes: number
  dramaIds: string[]
}

interface CalendarData {
  year: number
  month: number
  dayMap: Record<string, DayData>
  totalDays: number
  totalEpisodes: number
  topDramaTitle: string | null
}

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const WEEK_NAMES = ['日', '一', '二', '三', '四', '五', '六']

// 追剧日历月视图
// GitHub 风格热力图：根据每天追剧的集数显示深浅
export default function MonthlyCalendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-12
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/following/calendar?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (d.error) {
          setData(null)
        } else {
          setData(d)
        }
      })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [year, month])

  // 计算当月所有日期
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayWeek = new Date(year, month - 1, 1).getDay() // 周日=0

  // 找最大 episodes 用于归一化颜色
  const maxEp = data ? Math.max(1, ...Object.values(data.dayMap).map(d => d.episodes)) : 1

  const getColor = (ep: number): React.CSSProperties => {
    if (ep === 0) return { backgroundColor: 'var(--bg-secondary)' }
    const ratio = ep / maxEp
    if (ratio < 0.25) return { backgroundColor: 'var(--brand-pale)' }
    if (ratio < 0.5) return { backgroundColor: 'rgba(212, 112, 96, 0.4)' }
    if (ratio < 0.75) return { backgroundColor: 'rgba(212, 112, 96, 0.6)' }
    return { backgroundColor: 'var(--brand)' }
  }

  const goPrev = () => {
    if (month === 1) {
      setMonth(12)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  const goNext = () => {
    if (month === 12) {
      setMonth(1)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
      {/* 标题 + 月份切换 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-[var(--brand-pale)] flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
          <h3 className="text-base font-bold text-[var(--text-primary)]">我的追剧足迹</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            className="w-7 h-7 rounded flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--brand)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-medium text-[var(--text-primary)] min-w-[60px] text-center">
            {year}年{MONTH_NAMES[month - 1]}
          </span>
          <button
            onClick={goNext}
            className="w-7 h-7 rounded flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--brand)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 周标题 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEK_NAMES.map(w => (
          <div key={w} className="text-center text-[10px] text-[var(--text-muted)] py-1">
            {w}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {/* 空白填充（月初前） */}
        {Array.from({ length: firstDayWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {/* 日期 */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayData = data?.dayMap[key]
          const ep = dayData?.episodes || 0
          const today = now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day
          return (
            <div
              key={key}
              className="aspect-square rounded-md flex flex-col items-center justify-center text-[10px] relative cursor-default transition-all hover:scale-110"
              style={getColor(ep)}
              title={dayData ? `${day}日 追了 ${dayData.episodes} 集` : `${day}日`}
            >
              <span className={`${ep > 0 ? 'text-white font-bold' : 'text-[var(--text-muted)]'} ${today ? 'underline' : ''}`}>
                {day}
              </span>
              {ep > 0 && (
                <span className="text-[8px] text-white/90 mt-0.5">EP{ep}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* 统计 */}
      {!loading && data && (
        <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
          <span>
            本月追剧 <strong className="text-[var(--text-primary)] font-bold">{data.totalDays}</strong> 天
          </span>
          <span>
            共 <strong className="text-[var(--text-primary)] font-bold">{data.totalEpisodes}</strong> 集
          </span>
          {data.topDramaTitle && (
            <span>
              最常追的剧：<strong className="text-[var(--brand)] font-bold">{data.topDramaTitle}</strong>
            </span>
          )}
        </div>
      )}

      {/* 图例 */}
      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
        <span>少</span>
        <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }} />
        <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--brand-pale)' }} />
        <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(212, 112, 96, 0.4)' }} />
        <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(212, 112, 96, 0.6)' }} />
        <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--brand)' }} />
        <span>多</span>
      </div>
    </div>
  )
}