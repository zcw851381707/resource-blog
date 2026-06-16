'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Article {
  id: string
  title: string
  slug: string
  coverImage: string | null
  isPublished: boolean
  pinned: boolean
  publishedAt: string | null
  createdAt: string
  dramaTitle: string | null
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'published' | 'draft'>('all')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/articles?admin=1&page=1')
      .then(r => { if (r.status === 401) { router.push('/admin'); return null }; return r.json() })
      .then(data => { if (data) setArticles(data.articles) })
      .finally(() => setLoading(false))
  }, [router])

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这篇文章？相关图片也会被删除。')) return
    await fetch(`/api/articles/${id}`, { method: 'DELETE' })
    setArticles(prev => prev.filter(a => a.id !== id))
  }

  const handleUnpublish = async (id: string) => {
    if (!confirm('确定下线这篇文章？前台将 404 无法访问。')) return
    await fetch(`/api/articles/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unpublish' }) })
    setArticles(prev => prev.map(a => a.id === id ? { ...a, isPublished: false } : a))
  }

  const handlePin = async (id: string, pin: boolean) => {
    await fetch(`/api/articles/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: pin ? 'pin' : 'unpin' }) })
    setArticles(prev => prev.map(a => a.id === id ? { ...a, pinned: pin } : a))
  }

  const filtered = articles.filter(a => {
    if (tab === 'published') return a.isPublished
    if (tab === 'draft') return !a.isPublished
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">文章管理</h1>
        <Link href="/admin/articles/new" className="px-5 py-2.5 rounded-lg bg-[var(--brand-pale)] text-[var(--brand)] text-sm font-semibold hover:bg-[var(--brand)] hover:text-white transition-all">
          + 写新文章
        </Link>
      </div>

      {/* 筛选标签 */}
      <div className="flex gap-2 mb-4">
        {[{ key: 'all', label: `全部(${articles.length})` }, { key: 'published', label: `已发布(${articles.filter(a => a.isPublished).length})` }, { key: 'draft', label: `草稿(${articles.filter(a => !a.isPublished).length})` }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`px-3 py-1 rounded-full text-xs transition-all ${tab === t.key ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[var(--text-muted)]">加载中...</p>
      ) : filtered.length === 0 ? (
        <p className="text-[var(--text-muted)] py-8 text-center">暂无文章</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <div key={a.id} className="flex items-center gap-5 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:shadow-sm transition-shadow">
              <div className="w-[160px] h-[90px] rounded-lg overflow-hidden bg-[var(--bg-secondary)] shrink-0">
                {a.coverImage ? (
                  <img src={a.coverImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs">无封面</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-[var(--text-primary)] line-clamp-1">{a.title}</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  {a.dramaTitle && (() => { try { const d = JSON.parse(a.dramaTitle); if (Array.isArray(d)) return <span className="mr-3">📺 {d.map((x:any) => x.title).join('、')}</span> } catch { return <span className="mr-3">[{a.dramaTitle}]</span> } })()}
                  {a.isPublished ? a.publishedAt?.slice(0, 10) : '草稿'}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${a.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {a.isPublished ? '已发布' : '草稿'}
              </span>
              {a.pinned && <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">📌 置顶</span>}
              <div className="flex gap-1.5">
                <Link href={`/admin/articles/${a.id}`} className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all">编辑</Link>
                {!a.pinned && <button onClick={() => handlePin(a.id, true)} className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all">置顶</button>}
                {a.pinned && <button onClick={() => handlePin(a.id, false)} className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all">取消置顶</button>}
                {a.isPublished && <button onClick={() => handleUnpublish(a.id)} className="px-3 py-1.5 rounded-lg border border-orange-200 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-all">下线</button>}
                <button onClick={() => handleDelete(a.id)} className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 transition-all">删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
