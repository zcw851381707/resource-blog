'use client'

import { useEffect, useState } from 'react'

interface StatsData {
  todayViews: number
  weeklyViews: number
  monthlyViews: number
  todayRegistered: number
  todayGuest: number
  topPages: Array<{ page: string; count: number }>
  recentUsers: number
}

export function AnalyticsPanel() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics/stats')
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-4 text-sm text-[var(--text-muted)]">加载中...</div>

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-5 mt-6">
      <h2 className="text-base font-bold text-[var(--text-primary)] mb-4">📈 埋点统计</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <StatCard label="今日访问" value={data?.todayViews || 0} />
        <StatCard label="本周访问" value={data?.weeklyViews || 0} />
        <StatCard label="本月访问" value={data?.monthlyViews || 0} />
        <StatCard label="月活注册用户" value={data?.recentUsers || 0} />
      </div>

      {(data?.todayRegistered !== undefined || data?.todayGuest !== undefined) && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">今日访问构成</h3>
          <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
            <span>注册用户: <span className="font-bold text-[var(--brand)]">{data?.todayRegistered || 0}</span></span>
            <span>游客: <span className="font-bold text-[var(--warning)]">{data?.todayGuest || 0}</span></span>
            <span>合计: <span className="font-semibold">{data?.todayViews || 0}</span></span>
          </div>
          {(data?.todayViews ?? 0) > 0 && (
            <div className="mt-1 h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden flex">
              <div className="h-full bg-[var(--brand)]" style={{ width: `${((data?.todayRegistered || 0) / (data?.todayViews || 1)) * 100}%` }} />
              <div className="h-full bg-[var(--warning)]" style={{ width: `${((data?.todayGuest || 0) / (data?.todayViews || 1)) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {data?.topPages && data.topPages.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">热门页面 TOP 10</h3>
          <div className="space-y-1">
            {data.topPages.map((p, i) => (
              <div key={p.page} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="w-5 text-right text-[var(--text-muted)]">{i + 1}</span>
                <span className="truncate flex-1">{p.page}</span>
                <span className="text-[var(--brand)] font-medium">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-3 text-center">
      <div className="text-xl font-bold text-[var(--brand)]">{value}</div>
      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{label}</div>
    </div>
  )
}
