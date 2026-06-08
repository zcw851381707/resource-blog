'use client'

import { useState, useEffect } from 'react'

interface Announcement {
  id: string
  content: string
  isActive: boolean
  createdAt: string
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const res = await fetch('/api/announcements')
    setAnnouncements(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, isActive: false }),
    })
    setContent('')
    load()
  }

  const handleToggle = async (ann: Announcement) => {
    await fetch(`/api/announcements/${ann.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !ann.isActive }),
    })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此公告吗？')) return
    await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <p className="text-[var(--text-muted)]">加载中...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">公告管理</h1>

      <form onSubmit={handleAdd} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">添加公告</h2>
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={3} placeholder="公告内容"
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] mb-4" required />
        <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
          添加
        </button>
      </form>

      <div className="space-y-3">
        {announcements.map(ann => (
          <div key={ann.id} className={`bg-[var(--bg-card)] border rounded-xl p-4 flex items-start gap-4 ${ann.isActive ? 'border-[var(--brand)]' : 'border-[var(--border)]'}`}>
            <div className="flex-1">
              <p className="text-sm text-[var(--text-primary)]">{ann.content}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{new Date(ann.createdAt).toLocaleString('zh-CN')}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => handleToggle(ann)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${ann.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {ann.isActive ? '启用中' : '已停用'}
              </button>
              <button onClick={() => handleDelete(ann.id)} className="text-sm text-red-500 hover:underline">删除</button>
            </div>
          </div>
        ))}
        {announcements.length === 0 && <div className="text-center py-8 text-[var(--text-muted)]">暂无公告</div>}
      </div>
    </div>
  )
}
