'use client'

import { useState, useEffect, useCallback } from 'react'

interface InviteItem {
  id: string; code: string; maxUses: number; usedCount: number
  expiresAt: string | null; createdAt: string
}

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<InviteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerate, setShowGenerate] = useState(false)
  const [maxUses, setMaxUses] = useState(1)
  const [expiresAt, setExpiresAt] = useState('')
  const [permanent, setPermanent] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/invites')
    if (res.ok) setInvites(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const generate = async () => {
    setGenerating(true)
    const res = await fetch('/api/admin/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxUses: Number(maxUses) || 1, expiresAt: permanent ? null : (expiresAt || null) }),
    })
    if (res.ok) {
      const data = await res.json()
      copyCode(data.code)
      setShowGenerate(false)
      setMaxUses(1)
      setExpiresAt('')
      setPermanent(true)
      load()
    } else {
      const data = await res.json()
      alert(data.error || '生成失败')
    }
    setGenerating(false)
  }

  const copyCode = (code: string) => {
    const text = `注册邀请码：${code}`
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(code)
      setTimeout(() => setCopied(''), 2000)
    }).catch(() => alert('复制失败，请手动复制：' + text))
  }

  const deleteCode = async (id: string) => {
    if (!confirm('确定删除该邀请码？')) return
    const res = await fetch('/api/admin/invites?id=' + id, { method: 'DELETE' })
    if (res.ok) load()
    else { const d = await res.json(); alert(d.error || '删除失败') }
  }

  const inputClass = "h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]"

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">邀请码管理</h1>
        <button onClick={() => setShowGenerate(true)} className="px-4 py-2 rounded-lg bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
          + 生成新邀请码
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">加载中...</p>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)]">
              <th className="text-left px-4 py-3 font-medium">邀请码</th>
              <th className="text-left px-4 py-3 font-medium">可用次数</th>
              <th className="text-left px-4 py-3 font-medium">已使用</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">过期时间</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">创建时间</th>
              <th className="text-left px-4 py-3 font-medium">状态</th>
              <th className="text-left px-4 py-3 font-medium">操作</th>
            </tr>
            </thead>
            <tbody>
            {invites.map(inv => (
              <tr key={inv.id} className="border-b border-[var(--border)] last:border-0 text-sm">
                <td className="px-4 py-3">
                  <span className="font-mono text-sm bg-[var(--brand-pale)] text-[var(--brand)] px-2 py-1 rounded">{inv.code}</span>
                </td>
                <td className="px-4 py-3 text-[var(--text-primary)]">{inv.maxUses}</td>
                <td className="px-4 py-3 text-[var(--text-primary)]">{inv.usedCount}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)] hidden md:table-cell">{inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString('zh-CN') : '永久'}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)] hidden md:table-cell">{new Date(inv.createdAt).toLocaleDateString('zh-CN')}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                    inv.usedCount >= inv.maxUses ? 'bg-red-50 text-red-500'
                    : inv.expiresAt && new Date(inv.expiresAt) < new Date() ? 'bg-yellow-50 text-yellow-600'
                    : 'bg-green-50 text-green-600'
                  }`}>
                    {inv.usedCount >= inv.maxUses ? '已用完' : inv.expiresAt && new Date(inv.expiresAt) < new Date() ? '已过期' : '进行中'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => copyCode(inv.code)} className="text-[var(--brand)] hover:underline">{copied === inv.code ? '已复制 ✓' : '复制'}</button>
                    <button onClick={() => deleteCode(inv.id)} className="text-red-500 hover:underline">删除</button>
                  </div>
                </td>
              </tr>
            ))}
            {invites.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--text-muted)] text-sm">暂无邀请码</td></tr>
            )}
            </tbody>
          </table>
        </div>
      )}

      {showGenerate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowGenerate(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">生成邀请码</h3>
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">使用次数</label>
                <input type="number" min={1} max={999} className={inputClass + ' w-full'} value={maxUses} onChange={e => setMaxUses(Number(e.target.value))} />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-2 cursor-pointer select-none">
                  <input type="checkbox" checked={permanent} onChange={e => setPermanent(e.target.checked)} className="w-4 h-4 accent-[var(--brand)]" />
                  永久有效
                </label>
                {!permanent && <div><label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">过期时间</label>
                <input type="date" className={inputClass + ' w-full'} value={expiresAt} onChange={e => setExpiresAt(e.target.value)} /></div>}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowGenerate(false)} className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--border)] transition-colors">取消</button>
              <button onClick={generate} disabled={generating} className="px-4 py-2 rounded-lg bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {generating ? '生成中...' : '生成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
