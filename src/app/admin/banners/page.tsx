'use client'

import { useState, useEffect } from 'react'

interface Banner {
  id: string
  title: string
  subtitle?: string | null
  highlightWord?: string | null
  image?: string | null
  gradientFrom: string
  gradientTo: string
  buttonText?: string | null
  buttonLink?: string | null
  sortOrder: number
  isActive: boolean
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [editing, setEditing] = useState<Banner | null>(null)
  const [form, setForm] = useState({
    title: '', subtitle: '', highlightWord: '', image: '',
    gradientFrom: '#D47060', gradientTo: '#E89080',
    buttonText: '立即查看', buttonLink: '/all',
    sortOrder: 0, isActive: true,
  })
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const res = await fetch('/api/banners')
    setBanners(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const method = editing ? 'PUT' : 'POST'
    const url = editing ? `/api/banners/${editing.id}` : '/api/banners'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    resetForm()
    load()
  }

  const resetForm = () => {
    setEditing(null)
    setForm({
      title: '', subtitle: '', highlightWord: '', image: '',
      gradientFrom: '#D47060', gradientTo: '#E89080',
      buttonText: '立即查看', buttonLink: '/all',
      sortOrder: 0, isActive: true,
    })
  }

  const handleEdit = (b: Banner) => {
    setEditing(b)
    setForm({
      title: b.title, subtitle: b.subtitle || '', highlightWord: b.highlightWord || '',
      image: b.image || '',
      gradientFrom: b.gradientFrom, gradientTo: b.gradientTo,
      buttonText: b.buttonText || '', buttonLink: b.buttonLink || '',
      sortOrder: b.sortOrder, isActive: b.isActive,
    })
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`确定要删除 Banner「${title}」吗？此操作不可撤销`)) return
    await fetch(`/api/banners/${id}`, { method: 'DELETE' })
    load()
  }

  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) {
        setForm(prev => ({ ...prev, image: data.url }))
      } else {
        alert(data.error || '上传失败，请重试')
      }
    } catch {
      alert('上传失败，请检查网络连接')
    } finally {
      setUploading(false)
      // 清空 input 以支持重复上传同一文件
      e.target.value = ''
    }
  }

  if (loading) return <p className="text-[var(--text-muted)]">加载中...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Banner 管理</h1>

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{editing ? '编辑 Banner' : '添加 Banner'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">标题（用 [关键词] 标记高亮）</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
              placeholder="例：最新热播资源，每日[更新]" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">副标题</label>
            <input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">按钮文字</label>
            <input value={form.buttonText} onChange={e => setForm({ ...form, buttonText: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">按钮链接</label>
            <input value={form.buttonLink} onChange={e => setForm({ ...form, buttonLink: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Banner 图片</label>
            <div className="flex gap-2 items-start">
              <label className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-opacity shrink-0 ${uploading ? 'bg-[var(--bg-secondary)] text-[var(--text-muted)] pointer-events-none' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:opacity-80'}`}>
                {uploading ? '上传中...' : '上传图片'}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </label>
              <input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="或输入图片URL"
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]" />
            </div>
            {form.image && (
              <div className="mt-2 relative inline-block">
                <img src={form.image} alt="预览" className="h-20 rounded-lg object-cover border border-[var(--border)]" />
                <button type="button" onClick={() => setForm(prev => ({ ...prev, image: '' }))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">x</button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">渐变色左（无图片时使用）</label>
            <div className="flex gap-2">
              <input type="color" value={form.gradientFrom} onChange={e => setForm({ ...form, gradientFrom: e.target.value })} className="w-10 h-10 rounded border-0 cursor-pointer" />
              <input value={form.gradientFrom} onChange={e => setForm({ ...form, gradientFrom: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">渐变色右（无图片时使用）</label>
            <div className="flex gap-2">
              <input type="color" value={form.gradientTo} onChange={e => setForm({ ...form, gradientTo: e.target.value })} className="w-10 h-10 rounded border-0 cursor-pointer" />
              <input value={form.gradientTo} onChange={e => setForm({ ...form, gradientTo: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">排序</label>
            <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-[var(--brand)]" />
              <span className="text-sm text-[var(--text-secondary)]">启用</span>
            </label>
          </div>
        </div>
        {/* 预览 */}
        <div className="mt-4 rounded-xl overflow-hidden relative"
          style={form.image ? undefined : { background: `linear-gradient(135deg, ${form.gradientFrom}, ${form.gradientTo})` }}>
          {form.image && <img src={form.image} alt="Banner" className="w-full h-32 object-cover" />}
          <div className={`flex flex-col items-center text-center py-8 px-6 ${form.image ? 'absolute inset-0 justify-center bg-black/30' : ''}`}>
            <h3 className="text-xl font-bold text-white">{form.title || '标题预览'}</h3>
            {form.subtitle && <p className="text-white/80 text-sm mt-1">{form.subtitle}</p>}
            {form.buttonText && <span className="mt-3 px-6 py-1.5 bg-white/20 text-white rounded-full text-sm border border-white/30">{form.buttonText}</span>}
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
            {editing ? '保存' : '添加'}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:opacity-90 transition-opacity">
              取消
            </button>
          )}
        </div>
      </form>

      {/* 列表 */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">标题</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">图片</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">状态</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">操作</th>
            </tr>
          </thead>
          <tbody>
            {banners.map(b => (
              <tr key={b.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{b.title}</td>
                <td className="px-4 py-3">
                  {b.image ? <img src={b.image} alt="" className="h-8 rounded object-cover" /> : <span className="text-xs text-[var(--text-muted)]">渐变色</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {b.isActive ? '启用' : '停用'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleEdit(b)} className="text-sm text-[var(--brand)] hover:underline mr-3">编辑</button>
                  <button onClick={() => handleDelete(b.id, b.title)} className="text-sm text-red-500 hover:underline">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {banners.length === 0 && <div className="text-center py-8 text-[var(--text-muted)]">暂无 Banner</div>}
      </div>
    </div>
  )
}
