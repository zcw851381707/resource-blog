'use client'

import { useEffect, useState } from 'react'

interface Follower {
  id: string
  username: string
  avatar: string | null
  status: string
  progress: number
  updatedAt: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  watching: { label: '追剧中', color: 'text-[var(--brand)]' },
  planned: { label: '想看', color: 'text-[var(--text-muted)]' },
  completed: { label: '已看完', color: 'text-green-600' },
  dropped: { label: '弃剧', color: 'text-gray-400' },
}

// 追剧伙伴列表
// 在剧详情页"简介"和"评论区"之间展示
export default function FollowersList({ dramaId }: { dramaId: string }) {
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [users, setUsers] = useState<Follower[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/drama/${dramaId}/followers`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        setTotal(data.total || 0)
        setUsers(data.users || [])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [dramaId])

  if (loading) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-lg bg-[var(--brand-pale)] flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </span>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">追剧伙伴</h3>
        </div>
        <div className="text-xs text-[var(--text-muted)] ml-9">加载中...</div>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-lg bg-[var(--brand-pale)] flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </span>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">追剧伙伴</h3>
        </div>
        <p className="text-xs text-[var(--text-muted)] ml-9">还没有人追这部剧，做第一个追剧的人吧 →</p>
      </div>
    )
  }

  const displayUsers = expanded ? users : users.slice(0, 5)

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-[var(--brand-pale)] flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </span>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            追剧伙伴
            <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">共 {total} 人</span>
          </h3>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 ml-9">
        {displayUsers.map(u => {
          const statusInfo = STATUS_LABELS[u.status] || STATUS_LABELS.planned
          return (
            <div key={u.id} className="flex flex-col items-center gap-1 group cursor-default">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[var(--bg-secondary)] border-2 border-[var(--border)] group-hover:border-[var(--brand)] transition-colors">
                {u.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)] font-medium">
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-[var(--text-muted)] max-w-[60px] truncate">{u.username}</span>
              {u.status === 'watching' && (
                <span className={`text-[9px] ${statusInfo.color}`}>EP{u.progress || 0}</span>
              )}
              {u.status === 'completed' && (
                <span className={`text-[9px] ${statusInfo.color}`}>✓</span>
              )}
            </div>
          )
        })}
        {users.length > 5 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--border)] group-hover:border-[var(--brand)] flex items-center justify-center text-xs text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors">
              +{users.length - 5}
            </div>
            <span className="text-[10px] text-[var(--text-muted)] group-hover:text-[var(--brand)]">展开</span>
          </button>
        )}
        {expanded && users.length > 5 && (
          <button
            onClick={() => setExpanded(false)}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--border)] group-hover:border-[var(--brand)] flex items-center justify-center text-xs text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors">
              收起
            </div>
            <span className="text-[10px] text-[var(--text-muted)]"> </span>
          </button>
        )}
      </div>
    </div>
  )
}