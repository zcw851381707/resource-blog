'use client'

import { useState, useEffect, useRef } from 'react'

interface Banner {
  id: string
  title: string
  subtitle?: string | null
  highlightWord?: string | null
  image?: string | null
  mediaType?: string
  videoUrl?: string | null
  videoPoster?: string | null
  videoDuration?: number | null
  gradientFrom: string
  gradientTo: string
  buttonText?: string | null
  buttonLink?: string | null
  bannerLink?: string | null
  showButton?: boolean
  isPortrait?: boolean
  isAd?: boolean
  adLabel?: string | null
  portraitImages?: string | null
  titleFont?: string | null
  sortOrder: number
  isActive: boolean
  dramaId?: string | null
  description?: string | null
  imagePosition?: string | null
}

interface DramaOption { id: string; title: string; originalTitle?: string | null }

// 竖版海报上传器：支持多张上传、删除、拖拽排序
function PortraitUploader({ images, uploading, onAdd, onRemove, onReorder }: {
  images: string[]
  uploading: boolean
  onAdd: (file: File) => Promise<void>
  onRemove: (url: string) => void
  onReorder: (urls: string[]) => void
}) {
  const [adding, setAdding] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAdding(true)
    try { await onAdd(file) } catch { alert('上传失败') }
    setAdding(false)
    e.target.value = ''
  }

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return
    const arr = [...images]
    ;[arr[from], arr[to]] = [arr[to], arr[from]]
    onReorder(arr)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-3">
        {images.map((url, i) => (
          <div key={url + i} className="relative group w-20 h-28 rounded-lg overflow-hidden border-2 border-[var(--border)] bg-[var(--bg)] shrink-0">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(url)}
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >×</button>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-0.5 pb-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={() => moveImage(i, i - 1)} disabled={i === 0}
                className="w-5 h-5 rounded bg-black/50 text-white text-xs disabled:opacity-30">◀</button>
              <button type="button" onClick={() => moveImage(i, i + 1)} disabled={i === images.length - 1}
                className="w-5 h-5 rounded bg-black/50 text-white text-xs disabled:opacity-30">▶</button>
            </div>
            <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center">{i + 1}</span>
          </div>
        ))}
        {images.length < 4 && (
          <label className={`w-20 h-28 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors shrink-0 ${
            adding || uploading ? 'border-[var(--border)] text-[var(--text-muted)] pointer-events-none' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]'
          }`}>
            {adding ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            ) : (
              <>
                <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span className="text-[10px]">添加</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
        )}
      </div>
      {images.length > 1 && (
        <p className="text-xs text-[var(--text-muted)]">hover 图片可排序或删除，前端按此顺序左右排列</p>
      )}
    </div>
  )
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [dramas, setDramas] = useState<DramaOption[]>([])
  const [editing, setEditing] = useState<Banner | null>(null)
  const [form, setForm] = useState({
    title: '', subtitle: '', highlightWord: '', image: '',
    mediaType: 'image' as 'image' | 'video',
    videoUrl: '', videoPoster: '', videoDuration: 0,
    gradientFrom: '#D47060', gradientTo: '#E89080',
    buttonLink: '', bannerLink: '', showButton: false, buttonText: '查看详情', isPortrait: false, portraitImages: '',
    isAd: false, adLabel: '', titleFont: '',
    sortOrder: 0, isActive: true,
    dramaId: '', description: '', imagePosition: 'center',
  })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [videoFile, setVideoFile] = useState<{ name: string; size: number; duration: number } | null>(null)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [dramaSearch, setDramaSearch] = useState('')
  const [showDramaList, setShowDramaList] = useState(false)
  const dramaInputRef = useRef<HTMLInputElement>(null)

  // 拖拽调整海报位置（直接 left/top，图片跟随鼠标方向）
  const imgRef = useRef<HTMLImageElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dragPos, setDragPos] = useState<{ left: number; top: number } | null>(null)
  const [imgNaturalRatio, setImgNaturalRatio] = useState<number | null>(null)
  const dragRef = useRef({ dragging: false, startCX: 0, startCY: 0, startL: -5, startT: -5 })

  // 预计算默认位置（兼容旧格式 "x% y%" 和新格式 "left% top% zoom%"）
  const p = (s: string, def: number) => { const n = parseFloat(s); return isNaN(n) ? def : n }
  const defaultPos = (() => {
    const parts = (form.imagePosition || 'center').split(/\s+/)
    if (parts.length >= 3) {
      return { left: p(parts[0], -5), top: p(parts[1], -5), zoom: p(parts[2], 110) }
    }
    const x = p(parts[0], 50)
    const y = p(parts[1], 50)
    const zoom = 110
    return { left: x * (100 - zoom) / 100, top: y * (100 - zoom) / 100, zoom }
  })()

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = ((e.clientX - rect.left) / rect.width) * 100
    const cy = ((e.clientY - rect.top) / rect.height) * 100
    const curPos = defaultPos
    dragRef.current = { dragging: true, startCX: cx, startCY: cy, startL: curPos.left, startT: curPos.top }
    setDragPos({ left: curPos.left, top: curPos.top })
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const cx = ((e.clientX - rect.left) / rect.width) * 100
    const cy = ((e.clientY - rect.top) / rect.height) * 100
    const dx = cx - dragRef.current.startCX
    const dy = cy - dragRef.current.startCY
    const newL = Math.round(dragRef.current.startL + dx)
    const newT = Math.round(dragRef.current.startT + dy)
    setDragPos({ left: newL, top: newT })
  }

  const handlePointerUp = () => {
    if (!dragRef.current.dragging) return
    dragRef.current.dragging = false
    setDragging(false)
    const zoom = defaultPos.zoom
    const cur = dragPos || { left: defaultPos.left, top: defaultPos.top }
    setForm(prev => ({ ...prev, imagePosition: `${cur.left}% ${cur.top}% ${zoom}%` }))
    setDragPos(null)
  }

  const load = async () => {
    const [bRes, dRes] = await Promise.all([
      fetch('/api/banners'),
      fetch('/api/drama'),
    ])
    setBanners(await bRes.json())
    const allDramas = await dRes.json()
    setDramas(allDramas.map((d: { id: string; title: string; originalTitle?: string | null }) => ({ id: d.id, title: d.title, originalTitle: d.originalTitle })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // 选了关联剧集 → 自动同步标题、简介、副标题（外语名）
  useEffect(() => {
    if (!form.dramaId) return
    const fetchDrama = async () => {
      const res = await fetch('/api/drama')
      const all = await res.json()
      const d = all.find((d: { id: string }) => d.id === form.dramaId)
      if (d) {
        setForm(prev => {
          if (prev.dramaId !== d.id) return prev // stale
          return {
            ...prev,
            title: prev.title || d.title || '',
            description: prev.description || (d as Record<string, unknown>).description as string || '',
            subtitle: (d as Record<string, unknown>).originalTitle as string || prev.subtitle || '',
          }
        })
      }
    }
    fetchDrama()
  }, [form.dramaId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const method = editing ? 'PUT' : 'POST'
    const url = editing ? `/api/banners/${editing.id}` : '/api/banners'
    setSubmitStatus('loading')
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          dramaId: form.dramaId || null,
          description: form.description || null,
          imagePosition: form.imagePosition || 'center',
          showButton: form.showButton ?? false,
          buttonText: form.showButton ? (form.buttonText || '查看详情') : null,
          bannerLink: form.bannerLink || null,
          isPortrait: form.isPortrait ?? false,
          isAd: form.isAd ?? false,
          adLabel: form.isAd ? (form.adLabel?.trim() || null) : null,
          titleFont: form.titleFont || null,
          portraitImages: form.portraitImages || null,
          mediaType: form.mediaType,
          videoUrl: form.videoUrl || null,
          videoPoster: form.videoPoster || null,
          videoDuration: form.videoDuration || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '请求失败' }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      resetForm()
      load()
      setSubmitStatus('success')
      setTimeout(() => setSubmitStatus('idle'), 2000)
    } catch (err) {
      setSubmitStatus('error')
      alert('保存失败：' + (err instanceof Error ? err.message : '未知错误'))
      setTimeout(() => setSubmitStatus('idle'), 3000)
    }
  }

  const resetForm = () => {
    setEditing(null)
    setForm({
      title: '', subtitle: '', highlightWord: '', image: '',
      mediaType: 'image',
      videoUrl: '', videoPoster: '', videoDuration: 0,
      gradientFrom: '#D47060', gradientTo: '#E89080',
      buttonLink: '', bannerLink: '', showButton: false, buttonText: '查看详情', isPortrait: false, portraitImages: '',
      isAd: false, adLabel: '', titleFont: '',
      sortOrder: 0, isActive: true,
      dramaId: '', description: '', imagePosition: 'center',
    })
    setVideoFile(null)
  }

  const handleEdit = (b: Banner) => {
    setEditing(b)
    setForm({
      title: b.title, subtitle: b.subtitle || '', highlightWord: b.highlightWord || '',
      image: b.image || '',
      mediaType: (b.mediaType as 'image' | 'video') || 'image',
      videoUrl: b.videoUrl || '', videoPoster: b.videoPoster || '', videoDuration: b.videoDuration || 0,
      gradientFrom: b.gradientFrom, gradientTo: b.gradientTo,
      buttonLink: b.buttonLink || '', bannerLink: b.bannerLink || '', showButton: b.showButton || false, buttonText: b.buttonText || '查看详情', isPortrait: b.isPortrait || false, portraitImages: b.portraitImages || '',
      isAd: b.isAd || false, adLabel: b.adLabel || '', titleFont: b.titleFont || '',
      sortOrder: b.sortOrder, isActive: b.isActive,
      dramaId: b.dramaId || '', description: b.description || '',
      imagePosition: b.imagePosition || 'center',
    })
    if (b.mediaType === 'video' && b.videoUrl) {
      setVideoFile(null) // editing existing video, no pending file
    } else {
      setVideoFile(null)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`确定要删除 Banner「${title}」吗？此操作不可撤销`)) return
    await fetch(`/api/banners/${id}`, { method: 'DELETE' })
    load()
  }

  // 交换两条 Banner 的 sortOrder 实现上下移动
  // 序号 = sortOrder 实际值，跟数据库绑定，永久不变（除非交换）
  // 使用服务端原子交换 API，一步完成，不会脏数据
  const handleMove = async (bannerId: string, direction: 'up' | 'down') => {
    try {
      const res = await fetch('/api/banners/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bannerId, direction }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error || `请求失败 (${res.status})`)
      }
    } catch (e) {
      alert('排序失败：' + (e instanceof Error ? e.message : '未知错误') + '\n请刷新页面后重试')
      return
    }
    load()
  }

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
        setImgNaturalRatio(null)
        setForm(prev => ({ ...prev, image: data.url }))
      } else {
        alert(data.error || '上传失败，请重试')
      }
    } catch {
      alert('上传失败，请检查网络连接')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // 视频选择 + 客户端校验
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 大小校验
    if (file.size > 300 * 1024 * 1024) {
      alert('视频不能超过 300MB')
      e.target.value = ''
      return
    }

    // 时长校验
    const tempVideo = document.createElement('video')
    tempVideo.preload = 'metadata'
    tempVideo.src = URL.createObjectURL(file)
    tempVideo.onloadedmetadata = () => {
      URL.revokeObjectURL(tempVideo.src)
      const duration = tempVideo.duration
      if (duration > 180) {
        alert('视频不能超过 3 分钟')
        e.target.value = ''
        return
      }
      setVideoFile({ name: file.name, size: file.size, duration: Math.round(duration) })
    }
    tempVideo.onerror = () => {
      URL.revokeObjectURL(tempVideo.src)
      alert('无法读取视频信息，请确认格式为 mp4')
      e.target.value = ''
    }
  }

  // 截取视频第 0.5 秒作为封面
  const capturePoster = async (file: File): Promise<File | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      video.preload = 'metadata'
      video.src = URL.createObjectURL(file)
      video.onloadedmetadata = () => {
        video.currentTime = 0.5
      }
      video.onseeked = () => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d')!.drawImage(video, 0, 0)
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(video.src)
          if (blob) {
            resolve(new File([blob], `poster_${Date.now()}.jpg`, { type: 'image/jpeg' }))
          } else {
            resolve(null)
          }
        }, 'image/jpeg', 0.8)
      }
      video.onerror = () => {
        URL.revokeObjectURL(video.src)
        resolve(null)
      }
    })
  }

  // 上传视频到服务器
  const handleVideoUpload = async () => {
    const input = document.querySelector<HTMLInputElement>('#video-file-input')
    const file = input?.files?.[0]
    if (!file) return

    setUploadingVideo(true)
    try {
      // 1. 先截图封面并上传
      const posterFile = await capturePoster(file)
      let posterUrl = ''
      if (posterFile) {
        const fd = new FormData()
        fd.append('mediaType', 'image')
        fd.append('file', posterFile)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.url) posterUrl = data.url
      }

      // 2. 上传视频
      const vfd = new FormData()
      vfd.append('mediaType', 'video')
      vfd.append('duration', String(videoFile?.duration || 0))
      vfd.append('file', file)
      const vres = await fetch('/api/upload', { method: 'POST', body: vfd })
      const vdata = await vres.json()
      if (!vdata.url) {
        alert(vdata.error || '视频上传失败')
        return
      }

      setForm(prev => ({
        ...prev,
        videoUrl: vdata.url,
        videoPoster: posterUrl,
        videoDuration: vdata.duration || videoFile?.duration || 0,
      }))
    } catch {
      alert('上传失败，请检查网络连接')
    } finally {
      setUploadingVideo(false)
    }
  }

  if (loading) return <p className="text-[var(--text-muted)]">加载中...</p>

  const hasImage = !!form.image
  const isVideo = form.mediaType === 'video'

  // 计算图片样式（渲染时直接计算，避免 useEffect 时序问题）
  const curLeft = dragPos ? dragPos.left : defaultPos.left
  const curTop = dragPos ? dragPos.top : defaultPos.top
  const curZoom = defaultPos.zoom
  const imgStyle: React.CSSProperties = {
    position: 'absolute',
    maxWidth: 'none',
    maxHeight: 'none',
  }
  // 与前台一致的 mask，做到 WYSIWYG：左边文字区对应的图片部分不可见
  const isPortraitPreview = imgNaturalRatio !== null && imgNaturalRatio < 0.85
  const adminMask = isPortraitPreview
    ? 'linear-gradient(to right, transparent 0%, transparent 5%, black 30%, black 100%)'
    : 'linear-gradient(to right, transparent 0%, transparent 8%, black 35%, black 100%)'
  if (isPortraitPreview) {
    // 竖版图：按高度缩放，宽度自适应；统一用 left 定位，避免与 applyImgPos 冲突
    imgStyle.left = `${curLeft}%`
    imgStyle.top = `${curTop}%`
    imgStyle.height = `${curZoom}%`
    imgStyle.width = 'auto'
    imgStyle.objectFit = 'contain'
  } else {
    // 横版图：按宽度缩放，高度自适应
    imgStyle.left = `${curLeft}%`
    imgStyle.top = `${curTop}%`
    imgStyle.width = `${curZoom}%`
    // 保持宽高比不变形：用 natural ratio 算出显式高度，避免 auto + absolute 的浏览器歧义
    imgStyle.height = imgNaturalRatio ? `${curZoom / imgNaturalRatio}%` : 'auto'
    imgStyle.objectFit = 'contain'
  }
  imgStyle.maskImage = adminMask
  imgStyle.WebkitMaskImage = adminMask

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Banner 管理</h1>

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{editing ? '编辑 Banner' : '添加 Banner'}</h2>

        {/* 媒体类型切换 */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-secondary)] mr-2">类型</span>
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, mediaType: 'image', image: prev.image || '', videoUrl: '', videoPoster: '', videoDuration: 0 }))}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${isVideo ? 'bg-[var(--bg-secondary)] text-[var(--text-muted)]' : 'bg-[var(--brand)] text-white'}`}
            >图片</button>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, mediaType: 'video', image: '', title: '', subtitle: '' }))}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${isVideo ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}
            >视频</button>
          </div>
          {isVideo && <span className="text-xs text-[var(--text-muted)]">视频 Banner 纯展示，无文字叠加</span>}
        </div>

        {/* 关联剧集 */}
        <div className="mb-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            关联剧集 <span className="text-[var(--text-muted)]">（打字搜索，选一部剧后标题和简介自动同步）</span>
          </label>
          <div className="relative">
            {form.dramaId ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--brand)] bg-[var(--brand-bg)]">
                <span className="flex-1 text-sm font-medium text-[var(--brand)]">
                  {dramas.find(d => d.id === form.dramaId)?.title || form.dramaId}
                </span>
                <button
                  type="button"
                  onClick={() => { setForm({ ...form, dramaId: '', title: '', description: '' }); setDramaSearch('') }}
                  className="w-5 h-5 rounded-full bg-[var(--brand)] text-white text-xs flex items-center justify-center hover:opacity-80"
                >×</button>
              </div>
            ) : (
              <>
                <input
                  ref={dramaInputRef}
                  type="text"
                  value={dramaSearch}
                  onChange={e => { setDramaSearch(e.target.value); setShowDramaList(true) }}
                  onFocus={() => setShowDramaList(true)}
                  onBlur={() => setTimeout(() => setShowDramaList(false), 200)}
                  placeholder="输入剧名搜索..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] text-sm"
                />
                {showDramaList && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg z-30">
                    <button
                      type="button"
                      onMouseDown={() => { setForm({ ...form, dramaId: '', title: '', description: '' }); setDramaSearch(''); setShowDramaList(false) }}
                      className="w-full text-left px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] border-b border-[var(--border)]"
                    >
                      不关联（手动填写）
                    </button>
                    {dramas
                      .filter(d => {
                        if (!dramaSearch) return true
                        const q = dramaSearch.toLowerCase()
                        return d.title.toLowerCase().includes(q) || (d.originalTitle || '').toLowerCase().includes(q)
                      })
                      .slice(0, 50)
                      .map(d => (
                        <button
                          key={d.id}
                          type="button"
                          onMouseDown={() => { setForm({ ...form, dramaId: d.id }); setDramaSearch(''); setShowDramaList(false) }}
                          className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                          {d.title}
                        </button>
                      ))}
                    {dramas.filter(d => {
                        if (!dramaSearch) return true
                        const q = dramaSearch.toLowerCase()
                        return d.title.toLowerCase().includes(q) || (d.originalTitle || '').toLowerCase().includes(q)
                      }).length === 0 && (
                      <p className="px-3 py-3 text-sm text-[var(--text-muted)] text-center">无匹配剧集</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {!isVideo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">标题</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
              placeholder={form.dramaId ? '留空则自动同步剧名' : '例：最新热播资源'} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              标题字体
            </label>
            <select
              value={form.titleFont || ''}
              onChange={e => setForm({ ...form, titleFont: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] text-sm"
            >
              <option value="">自动（系统随机分配）</option>
              <option value="FontTitle-ChenYuluoyan">辰宇落雁体 · 清秀手写</option>
              <option value="FontTitle-Honglei">鸿雷行书 · 豪放行书</option>
              <option value="FontTitle-Ximai">喜脉体 · 俏皮美术</option>
              <option value="FontTitle-XimaiXihuan">喜脉喜欢体 · 圆润可爱</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              副标题（外语名） <span className="text-[var(--text-muted)]">关联剧集后自动填入</span>
            </label>
            <input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })}
              placeholder={form.dramaId ? '自动从剧集获取...' : '手动输入外语名'}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.showButton} onChange={e => setForm({ ...form, showButton: e.target.checked })}
                className="w-4 h-4 accent-[var(--brand)]" />
              <span className="text-sm text-[var(--text-secondary)]">显示按钮</span>
            </label>
          </div>
          {form.showButton && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">按钮文字</label>
                <input value={form.buttonText} onChange={e => setForm({ ...form, buttonText: e.target.value })}
                  placeholder="查看详情"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">按钮链接</label>
                <input value={form.buttonLink} onChange={e => setForm({ ...form, buttonLink: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
              </div>
            </>
          )}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Banner 跳转链接 <span className="text-[var(--text-muted)]">点击整个 Banner 时跳转，不填则优先跳转关联剧集</span>
            </label>
            <input value={form.bannerLink} onChange={e => setForm({ ...form, bannerLink: e.target.value })}
              placeholder="例：https://example.com 或 /drama/slug"
              className="w-full px-3 py-2 mb-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">简介</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
              placeholder={form.dramaId ? '留空则自动同步剧集简介' : 'Banner 上的简介文字，两行以内'}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] resize-none" />
          </div>
        </div>
        )}

        {/* 海报图片 + 裁切区域 */}
        {!isVideo && (
        <div className="mb-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">海报图片</label>
          <div className="flex gap-2 mb-3">
            <label className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all shrink-0 ${
              uploading
                ? 'bg-[var(--bg-secondary)] text-[var(--text-muted)] pointer-events-none'
                : 'bg-[var(--brand)] text-white hover:opacity-90 active:scale-95 shadow-sm'
            }`}>
              {uploading ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  上传中...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  上传图片
                </span>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
            <input value={form.image} onChange={e => { setImgNaturalRatio(null); setForm({ ...form, image: e.target.value }) }} placeholder="或输入图片URL"
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]" />
          </div>

          {form.image && (
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1.5">拖动调整海报位置，滑块调缩放</p>
              <div className="relative w-full overflow-hidden rounded-lg border-2 border-[var(--brand)] cursor-crosshair touch-none select-none"
                style={{ aspectRatio: '3/1', background: 'rgba(20,20,20,0.95)' }}
                onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
                <img ref={imgRef} src={form.image} alt="拖动调整" className="pointer-events-none"
                  onLoad={(e) => {
                    const img = e.currentTarget
                    setImgNaturalRatio(img.naturalWidth / img.naturalHeight)
                  }}
                  style={imgStyle} />
                {/* 左侧实底色面板示意 */}
                <div className="absolute left-0 top-0 bottom-0 pointer-events-none"
                  style={{
                    width: '38%',
                    background: `
                      radial-gradient(ellipse at 18% 15%, rgba(255,255,255,0.10) 0%, transparent 50%),
                      linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 40%),
                      rgba(30,30,40,0.92)
                    `,
                    maskImage: 'linear-gradient(to right, black 0%, black 55%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to right, black 0%, black 55%, transparent 100%)',
                  }}
                />
                {/* 左侧文字示意 */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col gap-1">
                  <div className="w-16 h-3 rounded bg-white/20" />
                  <div className="w-24 h-4 rounded bg-white/40" />
                  <div className="w-20 h-2.5 rounded bg-white/15" />
                  <div className="w-14 h-2.5 rounded bg-white/15" />
                </div>
                {/* 拖动辅助十字线 */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <svg className={`w-8 h-8 transition-colors ${dragging ? 'text-white' : 'text-white/30'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" strokeWidth="1.5" /><path d="M12 2v6m0 8v6M2 12h6m8 0h6" strokeWidth="1" />
                  </svg>
                </div>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1 text-center">{form.imagePosition || 'center'}</p>

              {/* 缩放控制 */}
              <div className="flex items-center gap-3 mt-3 px-2">
                <span className="text-xs text-[var(--text-muted)] shrink-0">缩放</span>
                <input
                  type="range"
                  min="100"
                  max="800"
                  step="5"
                  value={defaultPos.zoom}
                  onChange={e => {
                    const newZoom = parseInt(e.target.value)
                    const oldZoom = defaultPos.zoom
                    const newLeft = Math.round((defaultPos.left + (oldZoom - newZoom) / 2) * 10) / 10
                    const newTop = Math.round((defaultPos.top + (oldZoom - newZoom) / 2) * 10) / 10
                    setForm(prev => ({ ...prev, imagePosition: `${newLeft}% ${newTop}% ${newZoom}%` }))
                  }}
                  className="flex-1 accent-[var(--brand)] h-1"
                />
                <span className="text-xs text-[var(--text-primary)] w-10 text-right">{defaultPos.zoom}%</span>
              </div>
            </div>
          )}

          {/* 广告/推广标签 */}
          <div className="mt-3 p-3 bg-[var(--bg-secondary)] rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isAd || false} onChange={e => setForm({ ...form, isAd: e.target.checked })}
                className="w-4 h-4 accent-[var(--brand)]" />
              <span className="text-sm font-medium text-[var(--text-secondary)]">标记为广告 / 推广</span>
              <span className="text-xs text-[var(--text-muted)]">勾选后前台右上角显示标签</span>
            </label>
            {form.isAd && (
              <div className="mt-2 ml-6">
                <label className="block text-xs text-[var(--text-secondary)] mb-1">标签文字（留空显示"广告"）</label>
                <input value={form.adLabel || ''} onChange={e => setForm({ ...form, adLabel: e.target.value })}
                  placeholder="如：推广 / 广告 / 赞助"
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
              </div>
            )}
          </div>

          {/* 竖版海报模式 */}
          <div className="flex items-center gap-3 mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPortrait} onChange={e => setForm({ ...form, isPortrait: e.target.checked })}
                className="w-4 h-4 accent-[var(--brand)]" />
              <span className="text-sm font-medium text-[var(--text-secondary)]">竖版海报模式</span>
            </label>
            <span className="text-xs text-[var(--text-muted)]">上传多张竖版海报，自动拼成横版横幅</span>
          </div>

          {form.isPortrait && (() => {
            const portraitList = form.portraitImages ? form.portraitImages.split(',').filter(Boolean) : []
            return (
            <div className="mt-3 p-4 bg-[var(--bg-secondary)] rounded-lg">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">竖版海报（2-4张，左右排列拼成横幅）</label>
              <PortraitUploader
                images={portraitList}
                uploading={uploading}
                onAdd={async (file: File) => {
                  const fd = new FormData(); fd.append('file', file)
                  const res = await fetch('/api/upload', { method: 'POST', body: fd })
                  const data = await res.json()
                  if (data.url) {
                    const current = form.portraitImages ? form.portraitImages.split(',').filter(Boolean) : []
                    setForm({ ...form, portraitImages: [...current, data.url].join(',') })
                  }
                }}
                onRemove={(url: string) => {
                  const current = form.portraitImages ? form.portraitImages.split(',').filter(Boolean) : []
                  setForm({ ...form, portraitImages: current.filter(u => u !== url).join(',') })
                }}
                onReorder={(urls: string[]) => {
                  setForm({ ...form, portraitImages: urls.join(',') })
                }}
              />
              {/* 竖版横幅预览 */}
              {portraitList.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-[var(--text-muted)] mb-1.5">横幅预览（实际展示效果）</p>
                  <div className="relative w-full overflow-hidden rounded-lg border border-[var(--border)] bg-black"
                    style={{ aspectRatio: '3/1' }}>
                    <div className="absolute inset-y-0 right-0 flex"
                      style={{
                        width: `${Math.min(portraitList.length * 25, 65)}%`,
                        maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 100%)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 100%)',
                      }}>
                      {portraitList.map((url, i) => (
                        <img key={i} src={url} alt={`海报 ${i + 1}`}
                          className="h-full object-cover"
                          style={{ width: `${100 / portraitList.length}%` }} />
                      ))}
                    </div>
                    {/* 左侧实色底示意 */}
                    <div className="absolute left-0 top-0 bottom-0 pointer-events-none"
                      style={{
                        width: '42%',
                        background: 'linear-gradient(to right, rgba(30,30,40,0.95) 0%, rgba(30,30,40,0.7) 60%, transparent 100%)',
                      }}>
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                        <div className="w-12 h-2.5 rounded bg-white/20" />
                        <div className="w-20 h-3.5 rounded bg-white/40" />
                        <div className="w-16 h-2 rounded bg-white/15" />
                        <div className="w-10 h-2 rounded bg-white/15" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )
          })()}
        </div>
        )}

        {/* 视频上传区域 */}
        {isVideo && (
        <div className="mb-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">视频文件</label>
          <div className="flex gap-2 mb-3">
            <label className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all shrink-0 ${
              uploadingVideo
                ? 'bg-[var(--bg-secondary)] text-[var(--text-muted)] pointer-events-none'
                : 'bg-[var(--brand)] text-white hover:opacity-90 active:scale-95 shadow-sm'
            }`}>
              {uploadingVideo ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  上传中...
                </span>
              ) : videoFile ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  重新选择
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
                  选择视频
                </span>
              )}
              <input id="video-file-input" type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleVideoSelect} />
            </label>
            {form.videoUrl && (
              <input value={form.videoUrl} readOnly className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm text-[var(--text-muted)]" />
            )}
          </div>

          {/* 选中视频的信息 */}
          {videoFile && (
            <div className="mb-3 p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className="text-[var(--text-primary)] font-medium truncate max-w-[300px]">{videoFile.name}</span>
                <span className="text-[var(--text-muted)]">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</span>
                <span className="text-[var(--text-muted)]">{Math.floor(videoFile.duration / 60)}:{(videoFile.duration % 60).toString().padStart(2, '0')}</span>
                <span className={videoFile.size <= 300 * 1024 * 1024 ? 'text-green-500' : 'text-red-500'}>{videoFile.size <= 300 * 1024 * 1024 ? '✓' : '✗'} 大小合规</span>
                <span className={videoFile.duration <= 180 ? 'text-green-500' : 'text-red-500'}>{videoFile.duration <= 180 ? '✓' : '✗'} 时长合规</span>
              </div>
              {videoFile.size <= 300 * 1024 * 1024 && videoFile.duration <= 180 && (
                <button
                  type="button"
                  onClick={handleVideoUpload}
                  disabled={uploadingVideo}
                  className="mt-2 px-4 py-1.5 rounded-lg bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {uploadingVideo ? '上传中...' : '上传到服务器'}
                </button>
              )}
            </div>
          )}

          {/* 封面预览 */}
          {form.videoPoster && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-[var(--text-muted)]">封面：</span>
              <img src={form.videoPoster} alt="封面" className="h-12 rounded object-cover border border-[var(--border)]" />
            </div>
          )}

          <p className="text-xs text-[var(--text-muted)] mt-2">支持 mp4 / webm，最大 300MB，最长 3 分钟。上传时自动截取封面。</p>
        </div>
        )}

        {/* 旧版渐变色（无图片时 fallback） */}
        {!isVideo && !hasImage && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">渐变色左</label>
              <div className="flex gap-2">
                <input type="color" value={form.gradientFrom} onChange={e => setForm({ ...form, gradientFrom: e.target.value })} className="w-10 h-10 rounded border-0 cursor-pointer" />
                <input value={form.gradientFrom} onChange={e => setForm({ ...form, gradientFrom: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">渐变色右</label>
              <div className="flex gap-2">
                <input type="color" value={form.gradientTo} onChange={e => setForm({ ...form, gradientTo: e.target.value })} className="w-10 h-10 rounded border-0 cursor-pointer" />
                <input value={form.gradientTo} onChange={e => setForm({ ...form, gradientTo: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-[var(--brand)]" />
            <span className="text-sm font-medium text-[var(--text-secondary)]">启用</span>
            <span className="text-xs text-[var(--text-muted)]">停用后前台不再展示，列表里仍可管理</span>
          </label>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={submitStatus === 'loading'}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              submitStatus === 'loading' ? 'bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed' :
              submitStatus === 'success' ? 'bg-green-500 text-white' :
              submitStatus === 'error' ? 'bg-red-500 text-white' :
              'bg-[var(--brand)] text-white hover:opacity-90'
            }`}>
            {submitStatus === 'loading' ? '提交中...' : submitStatus === 'success' ? '✓ 已保存' : submitStatus === 'error' ? '✗ 失败' : editing ? '保存' : '添加'}
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
              <th className="text-center px-3 py-3 text-sm font-medium text-[var(--text-secondary)] w-14">序号</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">标题</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">关联剧集</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">海报</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">状态</th>
              <th className="text-center px-3 py-3 text-sm font-medium text-[var(--text-secondary)] w-20">排序</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">操作</th>
            </tr>
          </thead>
          <tbody>
            {[...banners].sort((a, b) => a.sortOrder - b.sortOrder).map((b, displayIdx) => {
              // 序号用 sortOrder 实际值（永久位次），不用 displayIdx，确保换了 Banner 也跟数据库
              const displayNum = b.sortOrder
              return (
              <tr key={b.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--brand-bg)] text-[var(--brand)] text-sm font-bold">
                    {displayNum}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-primary)] font-medium">{b.title || '(无标题)'}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                  {b.dramaId ? (dramas.find(d => d.id === b.dramaId)?.title || b.dramaId) : '-'}
                </td>
                <td className="px-4 py-3">
                  {b.mediaType === 'video' ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">🎬 视频</span>
                  ) : b.image ? (
                    <img src={b.image} alt="" className="h-8 rounded object-cover" />
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">渐变色</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {b.isActive ? '启用' : '停用'}
                  </span>
                </td>
                <td className="px-3 py-3 text-center whitespace-nowrap">
                  {/* 上移下移按钮：垂直堆叠居中 */}
                  <div className="inline-flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleMove(b.id, 'up')}
                      disabled={displayIdx === 0}
                      title="上移"
                      className="inline-flex items-center justify-center w-7 h-6 rounded text-[var(--text-secondary)] hover:bg-[var(--brand)] hover:text-white disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(b.id, 'down')}
                      disabled={displayIdx === banners.length - 1}
                      title="下移"
                      className="inline-flex items-center justify-center w-7 h-6 rounded text-[var(--text-secondary)] hover:bg-[var(--brand)] hover:text-white disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => handleEdit(b)} className="text-sm text-[var(--brand)] hover:underline mr-3">编辑</button>
                  <button onClick={() => handleDelete(b.id, b.title)} className="text-sm text-red-500 hover:underline">删除</button>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
        {banners.length === 0 && <div className="text-center py-8 text-[var(--text-muted)]">暂无 Banner</div>}
      </div>
    </div>
  )
}
