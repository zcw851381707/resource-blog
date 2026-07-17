'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import DramaCard from '@/components/DramaCard'
import DramaGrid from '@/components/DramaGrid'
import { isUpcomingActive } from '@/lib/drama-schedule-utils'

interface Drama {
  id: string
  title: string
  slug: string
  coverImage?: string | null
  region?: string | null
  isNewlyAired: boolean
  isUpcoming: boolean
  expectedDate?: string | null
  expectedPrecision?: string | null
  airTime?: string | null
  isCompleted: boolean
  totalEpisodes?: number | null
  currentEpisode?: number | null
  manualEpisode?: number | null
  startDate?: string | null
  isOnSchedule: boolean
  tags?: string | null
  clickCount: number
}

const regions = [
  { key: '', label: '全部' },
  { key: '华语剧', label: '华语剧' },
  { key: '泰国', label: '泰剧' },
  { key: '韩国', label: '韩剧' },
  { key: '日本', label: '日剧' },
  { key: '其他', label: '其他' },
]

function AllPageContent() {
  const searchParams = useSearchParams()
  const [dramas, setDramas] = useState<Drama[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get('region') || '')
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || '')

  useEffect(() => {
    fetch('/api/drama')
      .then(r => r.json())
      .then(data => {
        setDramas(data)
        setLoading(false)
      })
  }, [])

  const filtered = dramas.filter(d => {
    if (selectedRegion) {
      const regionMap: Record<string, string[]> = {
        '华语剧': ['中国', '中国台湾', '中国香港', '中国澳门'],
        '泰国': ['泰国', '越南', '缅甸', '菲律宾', '新加坡', '马来西亚'],
        '韩国': ['韩国'],
        '日本': ['日本'],
        '其他': ['其他地区'],
      }
      const includes = regionMap[selectedRegion] || [selectedRegion]
      const dramaRegions = (d.region || '').split(',').filter(Boolean)
      if (!dramaRegions.some(r => includes.includes(r))) return false
    }
    if (selectedTag === 'new') {
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      if (!d.createdAt || new Date(d.createdAt) < threeMonthsAgo) return false
    }
    if (selectedTag === 'upcoming' && !isUpcomingActive(d)) return false
    if (selectedTag === 'schedule' && !d.isOnSchedule) return false
    if (selectedTag === 'completed' && !d.isCompleted) return false
    return true
  })

  // 按点击量排序
  filtered.sort((a, b) => b.clickCount - a.clickCount)

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-[var(--bg-secondary)] rounded"></div>
          <div className="flex gap-2 justify-center">{[...Array(5)].map((_, i) => <div key={i} className="h-8 w-16 bg-[var(--bg-secondary)] rounded-full" />)}</div>
          <div className="drama-grid">{[...Array(12)].map((_, i) => <div key={i} className="aspect-[2/3] bg-[var(--bg-secondary)] rounded-lg" />)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">全部剧集</h1>

      {/* 地区筛选 */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {regions.map(r => (
            <button key={r.key} onPointerDown={() => setSelectedRegion(r.key)}
              className={`px-4 py-1.5 rounded-full text-sm transition-all duration-200 active:scale-95 ${
                selectedRegion === r.key
                  ? 'bg-[var(--brand)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--brand-pale)]'
              }`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* 标签筛选 */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {[
            { key: '', label: '全部' },
            { key: 'schedule', label: '追剧中' },
            { key: 'completed', label: '已完结' },
            { key: 'new', label: '最新上线' },
            { key: 'upcoming', label: '即将上线' },
          ].map(t => (
            <button key={t.key} onPointerDown={() => setSelectedTag(t.key)}
              className={`px-3 py-1 rounded-full text-xs transition-all duration-200 active:scale-95 ${
                selectedTag === t.key
                  ? 'bg-[var(--brand-light)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--brand-pale)]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 剧集列表：居中网格，手机3个，电脑6个 */}
      {filtered.length > 0 ? (
        <DramaGrid>
          {filtered.map(d => (
            <DramaCard key={d.id} drama={d} />
          ))}
        </DramaGrid>
      ) : (
        <div className="text-center py-16 text-[var(--text-muted)]">
          未找到相关结果
        </div>
      )}
    </div>
  )
}

export default function AllPage() {
  return (
    <Suspense fallback={<div className="max-w-[1200px] mx-auto px-4 py-8"><p className="text-[var(--text-muted)]">加载中...</p></div>}>
      <AllPageContent />
    </Suspense>
  )
}
