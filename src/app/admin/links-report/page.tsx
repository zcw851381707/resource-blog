'use client'

import { useState, useEffect } from 'react'

interface LinkReportData {
  id: string
  dramaId: string
  linkId: string
  linkPlatform: string
  issueType?: string | null
  note?: string | null
  email?: string | null
  isProcessed: boolean
  createdAt: string
  drama: { title: string; slug: string }
  link: { url: string; extractCode: string | null } | null
}

export default function AdminLinkReports() {
  const [reports, setReports] = useState<LinkReportData[]>([])
  const [loading, setLoading] = useState(true)
  const [editingLink, setEditingLink] = useState<{ linkId: string; platform: string; url: string; extractCode: string } | null>(null)

  const load = async () => {
    const res = await fetch('/api/link-report')
    setReports(await res.json())
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  const handleToggle = async (id: string, current: boolean) => {
    await fetch('/api/link-report', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isProcessed: !current }),
    })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此报错记录？')) return
    await fetch('/api/link-report', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  const handleUpdateLink = async () => {
    if (!editingLink) return
    await fetch('/api/link-report', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkId: editingLink.linkId, url: editingLink.url, extractCode: editingLink.extractCode || null }),
    })
    setEditingLink(null)
    load()
  }

  if (loading) return <p className="text-[var(--text-muted)]">加载中...</p>

  const unprocessed = reports.filter(r => !r.isProcessed)
  const processed = reports.filter(r => r.isProcessed)

  function renderGroup(list: LinkReportData[], isDone: boolean) {
    const grouped = new Map<string, LinkReportData[]>()
    for (const r of list) {
      const key = r.dramaId
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(r)
    }
    return Array.from(grouped.entries()).map(([dramaId, items]) => (
      <div key={dramaId} className="bg-[var(--bg-card)] border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <a href={`/admin/drama`} className="font-medium text-[var(--text-primary)] hover:text-[var(--brand)]">{items[0].drama.title}</a>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDone ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{items.length}次报错</span>
        </div>
        <div className="space-y-2">
          {items.map(r => (
            <div key={r.id} className={`text-sm rounded-lg px-3 py-2 ${
              isDone ? 'bg-green-50/50' : 'bg-[var(--bg-secondary)]'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`font-medium shrink-0 ${isDone ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                    {r.linkPlatform}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    isDone ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {r.issueType || '链接失效'}
                  </span>
                  {r.note && <span className="text-xs text-[var(--text-secondary)] truncate max-w-[240px]">{r.note}</span>}
                  {r.email && <span className="text-xs text-[var(--brand)] truncate">📧 {r.email}</span>}
                  <span className="text-xs text-[var(--text-muted)] shrink-0">{new Date(r.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    onClick={() => handleToggle(r.id, r.isProcessed)}
                    className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                      isDone
                        ? 'border-green-300 text-green-600 bg-white hover:bg-green-50'
                        : 'border-gray-300 text-[var(--text-muted)] hover:border-green-400 hover:text-green-600'
                    }`}
                  >
                    {isDone ? '✓ 已处理' : '标记处理'}
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline shrink-0">删除</button>
                </div>
              </div>
              {/* 原始链接 + 编辑入口 */}
              {r.link && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[var(--text-muted)] shrink-0">当前链接：</span>
                  <a href={r.link.url} target="_blank" rel="noopener noreferrer" className="text-[var(--brand)] hover:underline truncate max-w-[300px]">{r.link.url}</a>
                  {r.link.extractCode && <span className="text-[var(--text-muted)] shrink-0">提取码：{r.link.extractCode}</span>}
                  <button
                    onClick={() => setEditingLink({ linkId: r.linkId, platform: r.linkPlatform, url: r.link!.url, extractCode: r.link!.extractCode || '' })}
                    className="text-xs text-[var(--brand)] hover:underline shrink-0 ml-auto"
                  >
                    更换链接
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    ))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">资源问题反馈</h1>

      {reports.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">暂无资源问题反馈</div>
      ) : (
        <div className="space-y-8">
          {unprocessed.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-red-500 mb-3">未处理 ({unprocessed.length})</h2>
              <div className="space-y-4">{renderGroup(unprocessed, false)}</div>
            </section>
          )}
          {processed.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-green-600 mb-3">已处理 ({processed.length})</h2>
              <div className="space-y-4">{renderGroup(processed, true)}</div>
            </section>
          )}
        </div>
      )}

      {/* 修改链接弹窗 */}
      {editingLink && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setEditingLink(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-2xl max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">更换链接 - {editingLink.platform}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">新链接地址</label>
                <input
                  value={editingLink.url}
                  onChange={e => setEditingLink({ ...editingLink, url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">提取码（选填）</label>
                <input
                  value={editingLink.extractCode}
                  onChange={e => setEditingLink({ ...editingLink, extractCode: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleUpdateLink} className="px-4 py-2 rounded-lg bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90">保存</button>
              <button onClick={() => setEditingLink(null)} className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
