'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'

interface AchievementItem {
  id: string
  code: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt: string | null
}

export default function AchievementWall() {
  const { user } = useAuth()
  const [items, setItems] = useState<AchievementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, unlocked: 0 })

  useEffect(() => {
    if (!user) { setLoading(false); return }
    // 先触发检查解锁，再刷新列表
    fetch('/api/achievements/check', { method: 'POST' }).catch(() => {})
      .finally(() => {
        fetch('/api/achievements')
          .then(r => r.json())
          .then(data => {
            setItems(data.items || [])
            setStats({ total: data.total || 0, unlocked: data.unlocked || 0 })
          })
          .catch(() => {})
          .finally(() => setLoading(false))
      })
  }, [user])

  if (loading) return null
  if (!user || items.length === 0) return null

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
        <span className="w-6 h-6 rounded-md bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)]">
          🏆
        </span>
        成就墙
        <span className="text-[10px] text-[var(--text-muted)] font-normal">
          {stats.unlocked}/{stats.total}
        </span>
      </h3>
      <div className="grid grid-cols-5 md:grid-cols-9 gap-2">
        {[...items].sort((a, b) => (a.unlocked === b.unlocked ? 0 : a.unlocked ? -1 : 1)).map(ach => (
          <div
            key={ach.id}
            className={`group relative flex flex-col items-center gap-1 p-2 rounded-lg text-center transition-all ${
              ach.unlocked
                ? 'bg-gradient-to-b from-[var(--brand-bg)] to-transparent border border-[var(--brand-pale)]'
                : 'bg-[var(--bg-secondary)] opacity-50'
            }`}
          >
            <span className={`text-xl ${ach.unlocked ? '' : 'grayscale'}`}>{ach.unlocked ? ach.icon : '🔒'}</span>
            <span className={`text-[9px] leading-tight ${ach.unlocked ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}`}>
              {ach.name}
            </span>
            {/* 鼠标悬停时显示解锁条件 */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 pointer-events-none">
              <div className="bg-gray-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg">
                {ach.unlocked ? '✅ ' : '🔒 '}{ach.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
