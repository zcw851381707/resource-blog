'use client'

import { useState, useEffect } from 'react'

type TabType = 'request' | 'share' | 'feedback'

interface ResourceRequest {
  id: string
  name: string
  type: string
  description?: string | null
  email?: string | null
  linkUrl?: string | null
  linkExtractCode?: string | null
  likes: number
  reply?: string | null
  isProcessed: boolean
  isPublic: boolean
  createdAt: string
}

const tabs: { key: TabType; label: string }[] = [
  { key: 'request', label: '资源心愿' },
  { key: 'share', label: '分享资源' },
  { key: 'feedback', label: '意见反馈' },
]

export default function AdminRequests() {
  const [requests, setRequests] = useState<ResourceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('request')
  const [replyMap, setReplyMap] = useState<Record<string, string>>({})
  const [replying, setReplying] = useState<Record<string, boolean>>({})
  const [editingReply, setEditingReply] = useState<Record<string, boolean>>({})

  const load = async () => {
    try {
      const res = await fetch('/api/requests?admin=1')
      const data = await res.json()
      if (Array.isArray(data)) {
        setRequests(data)
      } else {
        setRequests([])
      }
    } catch {
      setRequests([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [activeTab])

  const handleProcess = async (req: ResourceRequest) => {
    await fetch(`/api/requests/${req.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isProcessed: !req.isProcessed }),
    })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此记录吗？')) return
    await fetch(`/api/requests/${id}`, { method: 'DELETE' })
    load()
  }

  const handleTogglePublic = async (req: ResourceRequest) => {
    await fetch('/api/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'togglePublic', id: req.id }),
    })
    load()
  }

  const handleReply = async (id: string) => {
    const reply = replyMap[id]
    if (!reply?.trim()) return
    setReplying(prev => ({ ...prev, [id]: true }))
    await fetch(`/api/requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply }),
    })
    setReplyMap(prev => { const n = { ...prev }; delete n[id]; return n })
    setReplying(prev => { const n = { ...prev }; delete n[id]; return n })
    setEditingReply(prev => { const n = { ...prev }; delete n[id]; return n })
    load()
  }

  if (loading) return <p className="text-[var(--text-muted)]">加载中...</p>

  const filtered = requests.filter(r => r.type === activeTab)
  const unprocessed = filtered.filter(r => !r.isProcessed)
  const processed = filtered.filter(r => r.isProcessed)

  function renderItems(list: ResourceRequest[], isDone: boolean) {
    return list.map(req => (
      <div key={req.id} className={`bg-[var(--bg-card)] border rounded-xl p-4 ${isDone ? 'opacity-60' : ''}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[var(--text-primary)] break-all">{req.name}</h3>
            {req.description && <p className="text-sm text-[var(--text-secondary)] mt-1 break-all">{req.description}</p>}
            {activeTab === 'share' && req.linkUrl && (
              <div className="text-xs text-[var(--brand)] mt-1.5 space-y-0.5">
                <p className="break-all">链接: {req.linkUrl}</p>
                {req.linkExtractCode && <p>提取码: {req.linkExtractCode}</p>}
              </div>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {activeTab === 'request' && <span className="text-xs text-[var(--text-muted)]">❤ {req.likes}</span>}
              {req.email && <span className="text-xs text-[var(--text-muted)]">📧 {req.email}</span>}
              <span className="text-xs text-[var(--text-muted)]">{new Date(req.createdAt).toLocaleString('zh-CN')}</span>
            </div>
            {/* 已回复 */}
            {req.reply && !editingReply[req.id] && (
              <div className="mt-2 bg-[var(--bg-secondary)] rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)] flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-[var(--brand)]">我的回复：</span>{req.reply}
                </div>
                <button
                  onClick={() => {
                    setReplyMap(prev => ({ ...prev, [req.id]: req.reply || '' }))
                    setEditingReply(prev => ({ ...prev, [req.id]: true }))
                  }}
                  className="text-[10px] text-[var(--brand)] hover:underline shrink-0"
                >编辑</button>
              </div>
            )}
            {/* 编辑回复 / 新建回复 */}
            {(editingReply[req.id] || !req.reply) && (
              <div className="mt-2 flex gap-2">
                <input
                  value={replyMap[req.id] || ''}
                  onChange={e => setReplyMap(prev => ({ ...prev, [req.id]: e.target.value }))}
                  placeholder="写下你的回复..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--brand)]"
                />
                <button
                  onClick={() => handleReply(req.id)}
                  disabled={!replyMap[req.id]?.trim() || replying[req.id]}
                  className="px-3 py-1.5 rounded-lg bg-[var(--brand)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-40"
                >
                  {replying[req.id] ? '保存中...' : editingReply[req.id] ? '保存' : '回复'}
                </button>
                {editingReply[req.id] && (
                  <button
                    onClick={() => {
                      setEditingReply(prev => { const n = { ...prev }; delete n[req.id]; return n })
                      setReplyMap(prev => { const n = { ...prev }; delete n[req.id]; return n })
                    }}
                    className="px-2 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >取消</button>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => handleProcess(req)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isDone ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
              }`}>
              {isDone ? '已处理' : '待处理'}
            </button>
            <button onClick={() => handleTogglePublic(req)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                req.isPublic ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}>
              {req.isPublic ? '公开' : '隐藏'}
            </button>
            <button onClick={() => handleDelete(req.id)} className="text-sm text-red-500 hover:underline">删除</button>
          </div>
        </div>
      </div>
    ))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">追剧许愿池管理</h1>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-4">
        {tabs.map(tab => {
          const count = requests.filter(r => r.type === tab.key && !r.isProcessed).length
          return (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-[var(--brand)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg)]'
              }`}>
              {tab.label} {count > 0 && <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{count}</span>}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">暂无{tabs.find(t => t.key === activeTab)?.label}记录</div>
      ) : (
        <div className="space-y-8">
          {unprocessed.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-orange-500 mb-3">待处理 ({unprocessed.length})</h2>
              <div className="space-y-3">{renderItems(unprocessed, false)}</div>
            </section>
          )}
          {processed.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-green-600 mb-3">已处理 ({processed.length})</h2>
              <div className="space-y-3">{renderItems(processed, true)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
