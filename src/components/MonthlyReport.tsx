'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'

interface ReportData {
  year: number
  month: number
  totalEpisodes: number
  totalDramas: number
  completedDramas: number
  topDrama: { title: string; slug: string } | null
}

export default function MonthlyReportSection() {
  const { user } = useAuth()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchIdRef = useRef(0)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const thisFetch = ++fetchIdRef.current
    setLoading(true); setError(null); setReport(null)
    fetch(`/api/reports/${year}/${month}`)
      .then(r => { if (!r.ok) throw new Error('请求失败'); return r.json() })
      .then(data => {
        if (thisFetch !== fetchIdRef.current) return
        if (data && !data.error) setReport(data)
        else setError(data.error || '获取失败')
      })
      .catch((e) => { if (thisFetch === fetchIdRef.current) setError(e.message) })
      .finally(() => { if (thisFetch === fetchIdRef.current) setLoading(false) })
  }, [user, year, month])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (year >= now.getFullYear() && month >= now.getMonth() + 1) return
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  if (!user) return null

  const monthNames = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const canNext = year < now.getFullYear() || month < now.getMonth() + 1

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
        <span className="w-6 h-6 rounded-md bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)]">
          📊
        </span>
        追剧报告
      </h3>
      <div className="flex items-center justify-center gap-4 mb-3">
        <button onClick={prevMonth} className="w-7 h-7 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center hover:bg-[var(--brand-pale)] transition-colors text-xs">◀</button>
        <span className="text-sm font-medium text-[var(--text-primary)]">{year}年{monthNames[month]}</span>
        <button onClick={nextMonth} disabled={!canNext} className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors text-xs ${canNext ? 'bg-[var(--bg-secondary)] hover:bg-[var(--brand-pale)]' : 'opacity-30 cursor-not-allowed'}`}>▶</button>
      </div>
      {loading ? (
        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 text-center text-xs text-[var(--text-muted)]">加载中...</div>
      ) : error ? (
        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 text-center text-xs text-[var(--text-muted)]">{error}</div>
      ) : !report || report.totalDramas === 0 ? (
        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 text-center text-xs text-[var(--text-muted)]">本月还没有追剧记录</div>
      ) : (
        <div className="bg-gradient-to-r from-[var(--brand-bg)] to-[var(--brand-grad-to)] rounded-xl p-4 border border-[var(--brand-pale)]">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-[var(--brand)]">{report.totalDramas}</div>
              <div className="text-[10px] text-[var(--text-muted)]">部剧</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--brand)]">{report.totalEpisodes}</div>
              <div className="text-[10px] text-[var(--text-muted)]">集</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--brand)]">{report.completedDramas}</div>
              <div className="text-[10px] text-[var(--text-muted)]">部已完结</div>
            </div>
          </div>
          {report.topDrama && (
            <div className="mt-2 text-center text-xs text-[var(--text-secondary)]">
              追最多: <Link href={`/drama/${report.topDrama.slug}`} className="text-[var(--brand)] font-medium hover:underline">{report.topDrama.title}</Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
