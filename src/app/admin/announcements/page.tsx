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
  const [toast, setToast] = useState('')

  // 发送通知相关
  const [notifTitle, setNotifTitle] = useState('')
  const [notifContent, setNotifContent] = useState('')
  const [notifSending, setNotifSending] = useState(false)
  const [confirmBroadcast, setConfirmBroadcast] = useState(false)

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

  // 提交发送通知（确认后才执行）
  const submitBroadcast = async () => {
    setNotifSending(true)
    setConfirmBroadcast(false)
    try {
      const res = await fetch('/api/admin/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: notifTitle, content: notifContent }),
      })
      const data = await res.json()
      if (data.ok) {
        setToast(`已发送给 ${data.count} 位用户`)
        setNotifTitle('')
        setNotifContent('')
      } else {
        setToast(data.error || '发送失败')
      }
    } catch {
      setToast('发送失败')
    } finally {
      setNotifSending(false)
      setTimeout(() => setToast(''), 3000)
    }
  }

  if (loading) return <p className="text-[var(--text-muted)]">加载中...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">公告管理</h1>

      {toast && (
        <div className="text-xs rounded-lg px-4 py-2 mb-4 bg-[var(--success-bg)] border border-[var(--success-border)] text-[var(--success)]">{toast}</div>
      )}

      {/* ===== 发送全站通知 ===== */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">发送全站通知</h2>
          <span className="text-[10px] text-orange-600">直接推送到用户头像红点 · 与公告独立</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4">通知会出现在所有用户的头像下拉菜单，未读时头像旁会显示红点提示。公告和通知是两条独立通道，公告发完后建议再单独发一次通知让用户看到。</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">通知标题</label>
            <input
              value={notifTitle}
              onChange={e => setNotifTitle(e.target.value)}
              maxLength={60}
              placeholder="如：📢 新剧上线、🎉 活动通知"
              className="w-full max-w-md px-3 py-2 rounded-lg border border-orange-200 bg-[var(--bg-card)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">通知内容</label>
            <textarea
              value={notifContent}
              onChange={e => setNotifContent(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="用户将在头像下拉菜单看到这段文字（最多 200 字）"
              className="w-full max-w-md px-3 py-2 rounded-lg border border-orange-200 bg-[var(--bg-card)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-orange-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!notifTitle.trim() || !notifContent.trim()) {
                  setToast('请填写标题和内容')
                  setTimeout(() => setToast(''), 2000)
                  return
                }
                setConfirmBroadcast(true)
              }}
              disabled={notifSending}
              className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {notifSending ? '发送中...' : '🔔 发送全站通知'}
            </button>
            <span className="text-[10px] text-[var(--text-muted)]">发送后立即推送给所有用户</span>
          </div>
        </div>
      </div>

      {/* ===== 全站发送确认弹窗 ===== */}
      {confirmBroadcast && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfirmBroadcast(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-2xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">确认发送全站通知？</h3>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 text-sm text-[var(--text-secondary)]">
              <p className="font-semibold mb-1 text-[var(--text-primary)]">{notifTitle}</p>
              <p className="text-xs leading-relaxed">{notifContent}</p>
            </div>
            <p className="text-xs text-[var(--warning)] mb-5">
              ⚠️ 此操作会立即推送给所有注册用户，请确认内容无误后再发送。
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmBroadcast(false)} className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--border)] transition-colors">再想想</button>
              <button onClick={submitBroadcast} className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors">确认发送</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 添加公告 ===== */}
      <form onSubmit={handleAdd} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">添加公告</h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">公告显示在站点顶部公告栏；如需让用户看到，建议配合上面的"发送全站通知"</p>
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={3} placeholder="公告内容"
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] mb-4" required />
        <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
          添加公告
        </button>
      </form>

      {/* ===== 公告列表 ===== */}
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
