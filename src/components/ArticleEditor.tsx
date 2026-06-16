'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import RichEditor from './RichEditor'

interface DramaOption { slug: string; title: string }

interface ArticleData {
  id?: string
  title: string
  slug: string
  content: string
  coverImage: string
  excerpt: string
  dramaTitle: string
  wechatUrl: string
  isPublished: boolean
  imagePosition?: string
}

export default function ArticleEditor({ article: existing }: ArticleEditorProps) {
  const router = useRouter()
  const isEdit = !!existing
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState(existing?.title || '')
  const [content, setContent] = useState(existing?.content || '')
  const [coverImage, setCoverImage] = useState(existing?.coverImage || '')
  const [excerpt, setExcerpt] = useState(existing?.excerpt || '')
  const [wechatUrl, setWechatUrl] = useState(existing?.wechatUrl || '')
  const [allDramas, setAllDramas] = useState<DramaOption[]>([])
  const [selectedDramas, setSelectedDramas] = useState<DramaOption[]>([])
  const [dramaSearch, setDramaSearch] = useState('')
  const [showDramaDropdown, setShowDramaDropdown] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imagePosition, setImagePosition] = useState(existing?.imagePosition || 'center')
  const [dragging, setDragging] = useState(false)
  const [dragPos, setDragPos] = useState({ x: 50, y: 50 })
  const [showCoverPicker, setShowCoverPicker] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // 从文章内容中提取所有图片
  const articleImages = (() => {
    const imgs: string[] = []
    const regex = /<img[^>]+src="([^"]+)"/g
    let match
    while ((match = regex.exec(content)) !== null) {
      if (!imgs.includes(match[1])) imgs.push(match[1])
    }
    return imgs
  })()

  // 拖动调整封面位置
  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
    setDragPos({ x, y })
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)))
    const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)))
    setDragPos({ x, y })
  }
  const handlePointerUp = () => {
    if (!dragging) return
    setDragging(false)
    const pos = `${dragPos.x}% ${dragPos.y}%`
    setImagePosition(pos)
  }

  // 加载剧集列表 & 解析已关联剧集
  useEffect(() => {
    fetch('/api/drama')
      .then(r => r.json())
      .then(data => setAllDramas(data.map((d: any) => ({ slug: d.slug, title: d.title }))))
    if (existing?.dramaTitle) {
      try { setSelectedDramas(JSON.parse(existing.dramaTitle)) } catch { /* ignore */ }
    }
  }, [existing])

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDramaDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 中文在 URL 路由里会 404，用 ID 前缀 + 简短英文
  const generateSlug = (t: string) => {
    const shortId = Math.random().toString(36).slice(2, 8)
    // 提取标题里前 3 个英文/数字词，或者用 fallback
    const en = t.replace(/[^\w]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase()
    if (en.length >= 3) return `${shortId}-${en.slice(0, 40)}`
    return `${shortId}-article`
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) setCoverImage(data.url)
    } catch { alert('上传失败') }
    finally { setUploading(false) }
  }

  const toggleDrama = (d: DramaOption) => {
    setSelectedDramas(prev => {
      const exists = prev.find(x => x.slug === d.slug)
      if (exists) return prev.filter(x => x.slug !== d.slug)
      return [...prev, d]
    })
  }

  const handleSave = async (publish: boolean) => {
    if (!title || !content) return alert('标题和内容不能为空')
    setSaving(true)
    const finalSlug = existing?.slug || generateSlug(title)
    const body: Record<string, unknown> = {
      title, slug: finalSlug, content,
      coverImage: coverImage || null,
      imagePosition: imagePosition || 'center',
      excerpt: excerpt || null,
      dramaTitle: selectedDramas.length > 0 ? JSON.stringify(selectedDramas) : null,
      wechatUrl: wechatUrl || null,
      isPublished: publish,
    }
    const url = isEdit ? `/api/articles/${existing!.id}` : '/api/articles'
    const method = isEdit ? 'PUT' : 'POST'
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      router.push('/admin/articles')
    } catch (e: any) {
      alert('保存失败: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredDramas = allDramas.filter(d =>
    d.title.toLowerCase().includes(dramaSearch.toLowerCase()) &&
    !selectedDramas.find(x => x.slug === d.slug)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {isEdit ? '编辑文章' : '写新文章'}
        </h1>
        <div className="flex gap-2">
          <button onClick={() => handleSave(false)} disabled={saving}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50">
            存草稿
          </button>
          <button onClick={() => handleSave(true)} disabled={saving}
            className="px-4 py-2 rounded-lg bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? '保存中...' : '发布'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* 标题 */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">标题 *</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="文章标题" className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 封面图 */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">封面图</label>
            <div className="flex gap-2">
              <input value={coverImage} onChange={e => setCoverImage(e.target.value)}
                placeholder="粘贴图片URL 或 点击上传/从文章选取" className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--brand)]" />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all whitespace-nowrap">
                {uploading ? '上传中...' : '📷 上传'}
              </button>
              {articleImages.length > 0 && (
                <button onClick={() => setShowCoverPicker(!showCoverPicker)}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all whitespace-nowrap">
                  🖼 从文章选
                </button>
              )}
            </div>
            {/* 从文章选取封面 */}
            {showCoverPicker && articleImages.length > 0 && (
              <div className="mt-2 p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
                <p className="text-xs text-[var(--text-muted)] mb-2">点击文章中的图片设为封面</p>
                <div className="flex gap-2 overflow-x-auto">
                  {articleImages.map((url, i) => (
                    <button key={i} onClick={() => { setCoverImage(url); setShowCoverPicker(false) }}
                      className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                        coverImage === url ? 'border-[var(--brand)]' : 'border-transparent hover:border-[var(--border)]'
                      }`}>
                      <img src={url} alt={`文章图片 ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* 封面预览 + 拖动调整位置 */}
            {coverImage && (
              <div className="mt-3 flex items-start gap-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1.5">拖动调整封面显示区域</p>
                  <div ref={previewRef}
                    className="relative aspect-[16/9] w-48 rounded-lg overflow-hidden border-2 border-[var(--brand)] cursor-crosshair touch-none select-none"
                    onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
                    <img src={coverImage} alt="封面预览" className="w-full h-full object-cover pointer-events-none"
                      style={{ objectPosition: dragging ? `${dragPos.x}% ${dragPos.y}%` : (imagePosition || 'center') }} />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <svg className={`w-6 h-6 transition-colors ${dragging ? 'text-white' : 'text-white/50'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="3" strokeWidth="1.5" /><path d="M12 2v6m0 8v6M2 12h6m8 0h6" strokeWidth="1" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1.5">快捷定位</p>
                  <div className="grid grid-cols-3 gap-1 w-[84px]">
                    {[['left top','top','right top'],['left','center','right'],['left bottom','bottom','right bottom']].map((row, ri) => row.map((pos) => (
                      <button key={pos} type="button" onClick={() => { setImagePosition(pos); setDragging(false) }}
                        className={`w-[26px] h-[26px] rounded border text-[9px] transition-colors ${
                          imagePosition === pos && !dragging ? 'bg-[var(--brand)] border-[var(--brand)] text-white' : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--brand)]'
                        }`} title={pos}>
                        {pos === 'center' ? '中' : pos === 'top' ? '上' : pos === 'bottom' ? '下' : pos === 'left' ? '左' : pos === 'right' ? '右' : pos === 'left top' ? '↖' : pos === 'right top' ? '↗' : pos === 'left bottom' ? '↙' : '↘'}
                      </button>
                    )))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 关联剧集 */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">关联剧集 <span className="text-[var(--text-muted)] text-xs">（可多选）</span></label>
            {/* 已选标签 */}
            <div className="flex flex-wrap gap-1 mb-1.5">
              {selectedDramas.map(d => (
                <span key={d.slug} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--brand-pale)] text-[var(--brand)]">
                  {d.title}
                  <button onClick={() => toggleDrama(d)} className="hover:text-red-500">×</button>
                </span>
              ))}
            </div>
            <input value={dramaSearch} onChange={e => { setDramaSearch(e.target.value); setShowDramaDropdown(true) }}
              onFocus={() => setShowDramaDropdown(true)}
              placeholder="搜索剧集..." className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]" />
            {showDramaDropdown && dramaSearch && (
              <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-lg">
                {filteredDramas.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-[var(--text-muted)]">无匹配结果</p>
                ) : (
                  filteredDramas.slice(0, 15).map(d => (
                    <button key={d.slug} onClick={() => { toggleDrama(d); setDramaSearch(''); setShowDramaDropdown(false) }}
                      className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
                      {d.title}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* 摘要 */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">摘要</label>
          <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2}
            placeholder="简短介绍，用于列表展示" className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] outline-none focus:border-[var(--brand)] resize-none" />
        </div>

        {/* 公众号链接 */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            公众号原文链接
          </label>
          <input value={wechatUrl} onChange={e => setWechatUrl(e.target.value)}
            placeholder="https://mp.weixin.qq.com/s/..." className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]" />
        </div>

        {/* 提示 */}
        <div className="p-3 rounded-lg bg-blue-50 text-blue-700 text-xs">
          💡 <strong>从公众号导入：</strong>在微信打开文章 → Ctrl+A 全选 → Ctrl+C 复制 → 回到下方编辑器 Ctrl+V 粘贴。图片会在保存时自动下载到本地。
        </div>

        {/* 富文本编辑器 */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">正文 *</label>
          <RichEditor content={content} onChange={setContent} />
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-center gap-3 pt-4 pb-8">
          <button onClick={() => handleSave(false)} disabled={saving}
            className="px-6 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50">
            存草稿
          </button>
          <button onClick={() => handleSave(true)} disabled={saving}
            className="px-6 py-2 rounded-lg bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? '保存中...' : '📤 发布'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface ArticleEditorProps {
  article?: ArticleData
}
