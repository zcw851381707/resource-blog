'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

type TabKey = 'clean' | 'suspicious' | 'toxic'

const TAB_LABELS: Record<TabKey, string> = {
  clean: '正常留言',
  suspicious: '可疑发言',
  toxic: '已清除',
}

export default function AdminCommentsPage() {
  const [tab, setTab] = useState<TabKey>('clean')
  const [items, setItems] = useState<Array<{
    id: string; content: string; flag: string; createdAt: string;
    userId: string; username: string; mutedUntil: string | null; dramaTitle: string; dramaSlug: string;
  }>>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [muteMenu, setMuteMenu] = useState<string | null>(null) // commentId 或 null
  const [muteLoading, setMuteLoading] = useState<string | null>(null)
  const [bannedWords, setBannedWords] = useState<Array<{ id: string; word: string }>>([])
  const [newBannedWord, setNewBannedWord] = useState('')
  const [showBannedWords, setShowBannedWords] = useState(true)

  const load = useCallback(async (p: number, t: TabKey) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/comments?tab=${t}&page=${p}&limit=20`)
      if (!res.ok) {
        setError(res.status === 403 ? '无权访问，请确认你已使用管理员账号登录' : `请求失败 (${res.status})`)
        setLoading(false)
        return
      }
      const data = await res.json()
      if (data.items) {
        setItems(data.items)
        setTotal(data.total)
        setPage(data.page)
        setTotalPages(data.totalPages)
      }
    } catch {
      setError('请求失败，请刷新重试')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(1, tab) }, [tab])
  useEffect(() => { if (page > 1) load(page, tab) }, [page])

  // 关闭禁言菜单的点击外部处理
  useEffect(() => {
    if (!muteMenu) return
    const handler = () => setMuteMenu(null)
    setTimeout(() => document.addEventListener('click', handler, { once: true }), 0)
    return () => document.removeEventListener('click', handler)
  }, [muteMenu])

  // 10分钟轮询
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (page === 1) load(1, tab)
    }, 600000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [tab, page, load])

  const doAction = async (commentId: string, action: 'restore' | 'delete') => {
    setActionLoading(commentId)
    try {
      const res = await fetch('/api/admin/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, action }),
      })
      const data = await res.json()
      if (data.ok) {
        setToast(data.message || '操作成功')
        load(1, tab)
      } else {
        setToast(data.error || '操作失败')
      }
    } catch {
      setToast('操作失败')
    }
    setActionLoading(null)
    setTimeout(() => setToast(''), 3000)
  }

  const muteUser = async (userId: string, duration: string, reason: string) => {
    setMuteLoading(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, action: 'mute', duration, reason }),
      })
      const data = await res.json()
      if (data.ok) {
        setToast('禁言成功')
        load(1, tab)
      } else {
        setToast(data.error || '操作失败')
      }
    } catch {
      setToast('操作失败')
    }
    setMuteLoading(null)
    setMuteMenu(null)
    setTimeout(() => setToast(''), 3000)
  }

  const unmuteUser = async (userId: string) => {
    setMuteLoading(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, action: 'unmute' }),
      })
      const data = await res.json()
      if (data.ok) {
        setToast('已解除禁言')
        load(1, tab)
      } else {
        setToast(data.error || '操作失败')
      }
    } catch {
      setToast('操作失败')
    }
    setMuteLoading(null)
    setMuteMenu(null)
    setTimeout(() => setToast(''), 3000)
  }

  const loadBannedWords = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/banned-words')
      const data = await res.json()
      setBannedWords(data || [])
    } catch { /* ignore */ }
  }, [])

  const addBannedWord = async () => {
    if (!newBannedWord.trim()) return
    try {
      const res = await fetch('/api/admin/banned-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: newBannedWord.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setNewBannedWord('')
        loadBannedWords()
        setToast('词条已添加')
      } else {
        setToast(data.error || '操作失败')
      }
    } catch {
      setToast('操作失败')
    }
    setTimeout(() => setToast(''), 3000)
  }

  const removeBannedWord = async (id: string) => {
    try {
      await fetch(`/api/admin/banned-words?id=${id}`, { method: 'DELETE' })
      loadBannedWords()
      setToast('词条已删除')
    } catch {
      setToast('操作失败')
    }
    setTimeout(() => setToast(''), 3000)
  }

  useEffect(() => { loadBannedWords() }, [loadBannedWords])

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">评论管理</h1>
        <span className="text-xs text-[var(--text-muted)]">共 {total} 条 · 实时刷新</span>
      </div>

      <div className="flex gap-2 mb-5">
        {(Object.keys(TAB_LABELS) as TabKey[]).map(key => (
          <button
            key={key}
            onClick={() => { setTab(key); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              tab === key
                ? (key === 'clean' ? 'bg-green-500/10 text-green-700 border-green-200' :
                   key === 'suspicious' ? 'bg-orange-500/10 text-orange-700 border-orange-200' :
                   'bg-red-500/10 text-red-700 border-red-200')
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      {/* 禁言词条（顶部，可折叠） */}
      <div className="mb-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
        <button
          onClick={() => setShowBannedWords(!showBannedWords)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">禁言词条</h2>
            <span className="text-[10px] text-[var(--text-muted)]">含该词的评论自动清除 · 共 {bannedWords.length} 条</span>
          </div>
          <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showBannedWords ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        {showBannedWords && (
          <>
            <div className="flex gap-2 mt-3 mb-3">
              <input
                value={newBannedWord}
                onChange={e => setNewBannedWord(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addBannedWord()}
                placeholder="输入要屏蔽的词条"
                className="flex-1 max-w-[280px] px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
              />
              <button onClick={addBannedWord} disabled={!newBannedWord.trim()}
                className="px-4 py-1.5 rounded-lg bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all">
                添加
              </button>
            </div>
            {bannedWords.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">暂无词条</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {bannedWords.map(bw => (
                  <span key={bw.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs">
                    {bw.word}
                    <button onClick={() => removeBannedWord(bw.id)}
                      className="ml-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}
      {loading ? (
        <div className="py-12 text-center text-sm text-[var(--text-muted)]">加载中...</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--text-muted)]">暂无评论</div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 hover:shadow-sm transition-all">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{item.username}</span>
                  <Link href={`/drama/${item.dramaSlug}`} target="_blank"
                    className="text-xs text-[var(--brand)] hover:underline truncate max-w-[200px]">
                    📺 {item.dramaTitle}
                  </Link>
                  <span className="text-[10px] text-[var(--text-muted)]">{timeAgoStr(item.createdAt)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    item.flag === 'toxic' ? 'bg-red-100 text-red-700' :
                    item.flag === 'suspicious' ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {item.flag === 'toxic' ? '已清除' : item.flag === 'suspicious' ? '可疑' : '正常'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <p className="flex-1 text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap break-words bg-[var(--bg-secondary)] rounded-lg p-3">
                    {item.content}
                  </p>
                  <div className="flex items-center gap-2 shrink-0 relative">
                    {item.flag !== 'clean' && (
                      <button onClick={() => doAction(item.id, 'restore')}
                        disabled={actionLoading === item.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--brand-pale)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white disabled:opacity-50 transition-all">
                        {actionLoading === item.id ? '...' : '恢复'}
                      </button>
                    )}
                    {item.mutedUntil && new Date(item.mutedUntil) > new Date() ? (
                      <button onClick={() => unmuteUser(item.userId)}
                        disabled={muteLoading === item.userId}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-600 hover:bg-green-600 hover:text-white disabled:opacity-50 transition-all">
                        {muteLoading === item.userId ? '...' : `已禁言至${new Date(item.mutedUntil).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}`}
                      </button>
                    ) : (
                      <button onClick={() => setMuteMenu(muteMenu === item.id ? null : item.id)}
                        disabled={muteLoading === item.userId}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white disabled:opacity-50 transition-all">
                        {muteLoading === item.userId ? '...' : '禁言'}
                      </button>
                    )}
                    <button onClick={() => doAction(item.id, 'delete')}
                      disabled={actionLoading === item.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50 transition-all">
                      {actionLoading === item.id ? '...' : '删除'}
                    </button>
                    {/* 禁言时长选择 */}
                    {muteMenu === item.id && (
                      <div className="absolute right-0 top-full mt-1 z-30 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-[140px]">
                        <button onClick={() => muteUser(item.userId, '1d', '禁言 1 天：请规范留言，如有再犯将加大处罚')} className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">禁言 1 天</button>
                        <button onClick={() => muteUser(item.userId, '3d', '禁言 3 天：请规范留言，如有再犯将加大处罚')} className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">禁言 3 天</button>
                        <button onClick={() => muteUser(item.userId, '7d', '禁言 7 天：请规范留言，如有再犯将加大处罚')} className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">禁言 1 周</button>
                        <button onClick={() => muteUser(item.userId, 'forever', '永久禁言：如有异议请联系管理员申诉')} className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">永久禁言</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: Math.min(totalPages, 20) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => { setPage(p); load(p, tab) }}
              className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                p === page ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--brand-pale)] hover:text-[var(--brand)]'
              }`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* 禁言词条管理已移至独立页面 /admin/banned-words */}
    </div>
  )
}

function timeAgoStr(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 天前`
  return `${Math.floor(day / 30)} 个月前`
}
