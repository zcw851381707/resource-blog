'use client'

import { useState, useEffect } from 'react'

interface SocialLink {
  id: string
  name: string
  icon: string
  url?: string | null
  qrCode?: string | null
  sortOrder: number
}

export default function AdminSocials() {
  const [socials, setSocials] = useState<SocialLink[]>([])
  const [editing, setEditing] = useState<SocialLink | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', icon: '', url: '', qrCode: '', sortOrder: 0 })

  const load = async () => {
    const res = await fetch('/api/socials')
    setSocials(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const method = editing ? 'PUT' : 'POST'
    const url = editing ? `/api/socials/${editing.id}` : '/api/socials'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    resetForm()
    load()
  }

  const resetForm = () => {
    setEditing(null)
    setForm({ name: '', icon: '', url: '', qrCode: '', sortOrder: 0 })
  }

  const handleEdit = (s: SocialLink) => {
    setEditing(s)
    setForm({ name: s.name, icon: s.icon, url: s.url || '', qrCode: s.qrCode || '', sortOrder: s.sortOrder })
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除「${name}」吗？此操作不可撤销`)) return
    await fetch(`/api/socials/${id}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <p className="text-[var(--text-muted)]">加载中...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">社交链接管理</h1>

      <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{editing ? '编辑' : '添加'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">名称</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="微博/抖音/B站/小红书/微信公众号"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">图标</label>
            <div className="flex gap-2">
              <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="WB/DY/BL/XHS/WX 或上传图片"
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
              <label className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity">
                上传
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const fd = new FormData()
                  fd.append('file', file)
                  const res = await fetch('/api/upload', { method: 'POST', body: fd })
                  const data = await res.json()
                  if (data.url) setForm(prev => ({ ...prev, icon: data.url }))
                }} />
              </label>
            </div>
            {form.icon && (form.icon.startsWith('/uploads/') || form.icon.startsWith('/api/uploads/') || form.icon.startsWith('http')) && (
              <img src={form.icon} alt="图标预览" className="mt-2 w-10 h-10 rounded-full object-cover border border-[var(--border)]" />
            )}
            {form.icon && !form.icon.startsWith('/uploads/') && !form.icon.startsWith('/api/uploads/') && !form.icon.startsWith('http') && (
              <div className="mt-2 w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#666' }}>{form.icon}</div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">链接 URL（微信公众号不填）</label>
            <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">二维码图片（仅微信公众号）</label>
            <div className="flex gap-2">
              <input value={form.qrCode} onChange={e => setForm({ ...form, qrCode: e.target.value })} placeholder="图片URL"
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
              <label className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity">
                上传
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const fd = new FormData()
                  fd.append('file', file)
                  const res = await fetch('/api/upload', { method: 'POST', body: fd })
                  const data = await res.json()
                  if (data.url) setForm(prev => ({ ...prev, qrCode: data.url }))
                }} />
              </label>
            </div>
            {form.qrCode && <img src={form.qrCode} alt="预览" className="mt-2 w-24 h-24 rounded-lg object-cover border border-[var(--border)]" />}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">排序</label>
            <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
            {editing ? '保存' : '添加'}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium">
              取消
            </button>
          )}
        </div>
      </form>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">名称</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">图标</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">链接</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">操作</th>
            </tr>
          </thead>
          <tbody>
            {socials.map(s => (
              <tr key={s.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{s.name}</td>
                <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{s.icon}</td>
                <td className="px-4 py-3 text-sm text-[var(--text-muted)] truncate max-w-[200px]">{s.url || s.qrCode || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleEdit(s)} className="text-sm text-[var(--brand)] hover:underline mr-3">编辑</button>
                  <button onClick={() => handleDelete(s.id, s.name)} className="text-sm text-red-500 hover:underline">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {socials.length === 0 && <div className="text-center py-8 text-[var(--text-muted)]">暂无社交链接</div>}
      </div>
    </div>
  )
}
