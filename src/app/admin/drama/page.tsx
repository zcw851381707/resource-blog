'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Drama {
  id: string
  title: string
  slug: string
  coverImage?: string | null
  description?: string | null
  region?: string | null
  tags?: string | null
  category?: string
  isOnSchedule: boolean
  isNewlyAired: boolean
  isUpcoming: boolean
  airDays?: string | null
  airTime?: string | null
  pausedDays?: string | null
  isSuspended?: boolean | null
  expectedDate?: string | null
  galleryImages?: string | null
  expectedPrecision?: string | null
  totalEpisodes?: number | null
  currentEpisode?: number | null
  manualEpisode?: number | null
  isCompleted: boolean
  completedAt?: string | null
  startDate?: string | null
  sortOrder: number
  videoUrl?: string | null
  videoLabel?: string | null
  seriesGroup?: string | null
  seriesOrder?: number | null
  episodesPerDay?: number | null
  premiereEpisodes?: number | null
  imagePosition?: string | null
  originalTitle?: string | null
  scheduleImage?: string | null
  createdAt: string
  updatedAt: string
  downloadLinks: { id: string; platform: string; url: string; extractCode?: string | null }[]
}

const regionOptions = ['中国', '中国台湾', '中国香港', '中国澳门', '泰国', '日本', '韩国', '越南', '缅甸', '菲律宾', '新加坡', '其他地区']
const dayOptions = [
  { value: '0', label: '周一' }, { value: '1', label: '周二' }, { value: '2', label: '周三' },
  { value: '3', label: '周四' }, { value: '4', label: '周五' }, { value: '5', label: '周六' }, { value: '6', label: '周日' },
]
const platforms = ['夸克网盘', '百度网盘', 'UC网盘', '迅雷网盘']

interface DownloadSlot {
  platform: string
  url: string
  extractCode: string
}

function getDefaultSlots(): DownloadSlot[] {
  return platforms.map(p => ({ platform: p, url: '', extractCode: '' }))
}

function generateSlug(): string {
  // 纯英文+数字 slug，避免中文 URL 404
  return `drama-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export default function AdminDrama() {
  const [dramas, setDramas] = useState<Drama[]>([])
  const [editing, setEditing] = useState<Drama | null>(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    title: '', slug: '', coverImage: '', description: '', region: '', tags: '', category: 'tv',
    isOnSchedule: false, isNewlyAired: false, isUpcoming: false,
    airDays: '', pausedDays: '', isSuspended: false, airTime: '', expectedDate: '', expectedPrecision: 'day',
    totalEpisodes: 0, currentEpisode: 0, manualEpisode: null as number | null,
    isCompleted: false, startDate: '',
    sortOrder: 0, videoUrl: '', videoLabel: '', seriesGroup: '', seriesOrder: 0,
    episodesPerDay: 1, premiereEpisodes: null as number | null, imagePosition: 'center', originalTitle: '', scheduleImage: '',
  })
  const [downloadSlots, setDownloadSlots] = useState<DownloadSlot[]>(getDefaultSlots())
  const [pasteText, setPasteText] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
  const [completeTarget, setCompleteTarget] = useState<{ id: string; title: string } | null>(null)
  const [showPause, setShowPause] = useState(false)
  const [tagHistory, setTagHistory] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'updated'>('newest')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [submitError, setSubmitError] = useState('')
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverZone, setDragOverZone] = useState<string | null>(null) // 'cover' | 'gallery'
  const formRef = useRef<HTMLFormElement>(null)
  const dragCounterRef = useRef(0)
  // refs to access latest functions in native event listeners without re-binding
  const uploadFileRef = useRef<(file: File) => Promise<string | null>>(async () => null)
  const uploadFromUrlRef = useRef<(imageUrl: string) => Promise<string | null>>(async () => null)
  const setCoverImageRef = useRef<(url: string) => void>(() => {})
  const setGalleryImagesRef = useRef<React.Dispatch<React.SetStateAction<string[]>>>(() => {})
  const [coverRotation, setCoverRotation] = useState(0)
  const [galleryRotations, setGalleryRotations] = useState<Record<string, number>>({})

  // 重复剧名检测
  const [dupResults, setDupResults] = useState<Drama[]>([])
  const dupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '')
  const searchDuplicates = useCallback((value: string) => {
    if (dupTimerRef.current) clearTimeout(dupTimerRef.current)
    if (!value.trim()) { setDupResults([]); return }
    dupTimerRef.current = setTimeout(() => {
      const q = normalize(value)
      const matches = dramas.filter(d =>
        d.id !== editing?.id && (
          normalize(d.title).includes(q) ||
          normalize(d.originalTitle || '').includes(q)
        )
      ).slice(0, 5)
      setDupResults(matches)
    }, 300)
  }, [dramas, editing])

  // 拖拽调整封面位置
  const [dragging, setDragging] = useState(false)
  const [dragPos, setDragPos] = useState({ x: 50, y: 50 })
  const dragRef = useRef({ dragging: false, x: 50, y: 50 })
  const previewRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
    dragRef.current = { dragging: true, x, y }
    setDragPos({ x, y })
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)))
    const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)))
    dragRef.current = { dragging: true, x, y }
    setDragPos({ x, y })
  }

  const handlePointerUp = () => {
    if (!dragRef.current.dragging) return
    dragRef.current.dragging = false
    setDragging(false)
    setForm(prev => ({ ...prev, imagePosition: `${dragRef.current.x}% ${dragRef.current.y}%` }))
  }

  // 加载标签历史
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tagHistory')
      if (stored) setTagHistory(JSON.parse(stored))
    } catch {}
  }, [])

  // 已完结状态下，总集数变化时自动同步当前集数
  useEffect(() => {
    if (form.isCompleted && form.totalEpisodes > 0 && form.currentEpisode !== form.totalEpisodes) {
      setForm(prev => ({ ...prev, currentEpisode: prev.totalEpisodes || 0 }))
    }
  }, [form.isCompleted, form.totalEpisodes])

  // 一键粘贴识别：自动识别剧名、地区、网盘链接
  const handlePasteParse = () => {
    const text = pasteText.trim()
    if (!text) return

    const slots = [...downloadSlots]
    const updatedForm = { ...form }

    // --- 识别剧名（只在标题为空时自动填充）---
    if (!updatedForm.title) {
      const titleMatch = text.match(/(?:剧名|标题|名称)[：:]\s*(.+)/)
      if (titleMatch) {
        updatedForm.title = titleMatch[1].trim()
      } else {
        const bookMatch = text.match(/《(.+?)》/)
        if (bookMatch) {
          updatedForm.title = bookMatch[1].trim()
        } else {
          const bracketMatch = text.match(/【(.+?)】/)
          if (bracketMatch) updatedForm.title = bracketMatch[1].trim()
        }
      }
    }

    // --- 识别地区（只在地区为空时自动填充）---
    if (!updatedForm.region) {
      if (/泰剧/.test(text)) updatedForm.region = '泰国'
      else if (/台剧/.test(text)) updatedForm.region = '中国台湾'
      else if (/华语剧|国语剧/.test(text)) updatedForm.region = '中国'
      else if (/日剧/.test(text)) updatedForm.region = '日本'
      else if (/韩剧/.test(text)) updatedForm.region = '韩国'

      if (!updatedForm.region) {
        const regionMatch = text.match(/(?:地区|国家|产地)[：:]\s*(.+)/)
        if (regionMatch) {
          const raw = regionMatch[1].trim()
          if (/中|大陆|内地/.test(raw)) updatedForm.region = '中国'
          else if (/台|台湾/.test(raw)) updatedForm.region = '中国台湾'
          else if (/港|香港/.test(raw)) updatedForm.region = '中国香港'
          else if (/泰/.test(raw)) updatedForm.region = '泰国'
          else if (/日/.test(raw)) updatedForm.region = '日本'
          else if (/韩/.test(raw)) updatedForm.region = '韩国'
          else if (/越/.test(raw)) updatedForm.region = '越南'
          else if (/缅/.test(raw)) updatedForm.region = '缅甸'
          else if (/菲/.test(raw)) updatedForm.region = '菲律宾'
          else if (/新加/.test(raw)) updatedForm.region = '新加坡'
        }
      }
    }

    // --- 识别网盘链接：只填充空位，不覆盖已有链接 ---
    const rules: { platform: string; urlRe: RegExp }[] = [
      { platform: '百度网盘', urlRe: /https?:\/\/pan\.baidu\.com\/s\/[^\s]*/i },
      { platform: '夸克网盘', urlRe: /https?:\/\/pan\.quark\.cn\/s\/[^\s]*/i },
      { platform: 'UC网盘', urlRe: /https?:\/\/drive\.uc\.cn\/s\/[^\s]*/i },
      { platform: '迅雷网盘', urlRe: /https?:\/\/pan\.xunlei\.com\/s\/[^\s]*/i },
    ]

    const extractMatch = text.match(/提取码[：:]\s*([a-zA-Z0-9]{4})/)
    const extractCode = extractMatch ? extractMatch[1] : ''

    for (const rule of rules) {
      const match = text.match(rule.urlRe)
      if (match) {
        const idx = slots.findIndex(s => s.platform === rule.platform)
        if (idx >= 0 && !slots[idx].url) {
          // 只填充空的槽位，已有链接的不覆盖
          slots[idx].url = match[0]
          if (rule.platform === '百度网盘' && extractCode && !slots[idx].extractCode) {
            slots[idx].extractCode = extractCode
          }
        }
      }
    }

    setForm(updatedForm)
    setDownloadSlots(slots)
  }

  const load = async () => {
    const res = await fetch('/api/drama')
    setDramas(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const method = editing ? 'PUT' : 'POST'
    const url = editing ? `/api/drama/${editing.id}` : '/api/drama'
    const links = downloadSlots.filter(l => l.url).map(l => ({
      platform: l.platform, url: l.url, extractCode: l.extractCode || undefined,
    }))
    // 不再搬运字段：title 留空就留空，详情页会用 originalTitle 兜底显示
    const finalTitle = form.title.trim()
    const finalOriginalTitle = form.originalTitle?.trim() || ''

    // 没有填写任何内容时不提交（但允许只填了外文原名）
    if (!finalTitle && !finalOriginalTitle && !form.coverImage && !form.description && links.length === 0 && !form.scheduleImage && !form.videoUrl) {
      return
    }
    const payload = {
      ...form,
      title: finalTitle,
      originalTitle: finalOriginalTitle,
      slug: editing ? editing.slug : generateSlug(),
      totalEpisodes: form.totalEpisodes ?? null,
      currentEpisode: form.currentEpisode ?? null,
      manualEpisode: form.manualEpisode ?? null,
      videoUrl: form.videoUrl || null,
      videoLabel: form.videoLabel || null,
      seriesGroup: form.seriesGroup || null,
      seriesOrder: form.seriesOrder || 0,
      episodesPerDay: form.episodesPerDay || 1, premiereEpisodes: form.premiereEpisodes ?? null,
      pausedDays: form.pausedDays || null,
      isSuspended: form.isSuspended,
      imagePosition: form.imagePosition || 'center',
      downloadLinks: links,
      galleryImages: galleryImages.length > 0 ? galleryImages : undefined,
    }
    setSubmitStatus('loading')
    setSubmitError('')
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.status === 401) {
        setSubmitError('登录已过期，请刷新页面重新登录')
        setSubmitStatus('error')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: '提交失败' }))
        throw new Error(data.error || '提交失败')
      }
      // 保存标签到历史
      if (form.tags && !tagHistory.includes(form.tags)) {
        const updated = [form.tags, ...tagHistory].slice(0, 10)
        setTagHistory(updated)
        localStorage.setItem('tagHistory', JSON.stringify(updated))
      }
      resetForm()
      load()
      setSubmitStatus('success')
      setTimeout(() => setSubmitStatus('idle'), 2500)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '添加失败')
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus('idle'), 3000)
    }
  }

  const resetForm = () => {
    setEditing(null)
    setDupResults([])
    setForm({
      title: '', slug: '', coverImage: '', description: '', region: '', tags: '', category: 'tv',
      isOnSchedule: false, isNewlyAired: false, isUpcoming: false,
      airDays: '', pausedDays: '', isSuspended: false, airTime: '', expectedDate: '', expectedPrecision: 'day',
      totalEpisodes: 0, currentEpisode: 0, manualEpisode: null as number | null,
      isCompleted: false, startDate: '',
      sortOrder: 0, videoUrl: '', videoLabel: '', seriesGroup: '', seriesOrder: 0,
      episodesPerDay: 1, premiereEpisodes: null as number | null, imagePosition: 'center', originalTitle: '', scheduleImage: '',
    })
    setDownloadSlots(getDefaultSlots())
    setPasteText('')
    setGalleryImages([])
    setCoverRotation(0)
    setGalleryRotations({})
  }

  const calcAutoEpisode = (d: Drama): number => {
    const start = d.startDate ? new Date(d.startDate) : null
    const prem = d.premiereEpisodes || d.episodesPerDay || 1
    const epd = d.episodesPerDay || 1
    const airDays = (d.airDays || '').split(',').map(s => s.trim()).filter(Boolean)
    if (!start || start > new Date()) return d.currentEpisode || 0
    // 计算从首播日到今天之间有多少个更新日
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const startDay = new Date(start); startDay.setHours(0, 0, 0, 0)
    let airCount = 0
    const cursor = new Date(startDay)
    while (cursor <= today) {
      const jsDay = cursor.getDay()
      const formDay = String(jsDay === 0 ? 6 : jsDay - 1)
      if (airDays.includes(formDay)) airCount++
      cursor.setDate(cursor.getDate() + 1)
    }
    if (airCount === 0) return d.currentEpisode || 0
    // 第一个更新日 = premiereEpisodes，之后每个 +episodesPerDay
    return prem + (airCount - 1) * epd
  }

  const handleEdit = (d: Drama) => {
    setEditing(d)
    setDupResults([])
    const autoEp = calcAutoEpisode(d)
    setForm({
      title: d.title, slug: d.slug, coverImage: d.coverImage || '', description: d.description || '',
      region: d.region || '', tags: d.tags || '', category: d.category || 'tv',
      isOnSchedule: d.isOnSchedule, isNewlyAired: d.isNewlyAired, isUpcoming: d.isUpcoming,
      airDays: d.airDays || '', pausedDays: d.pausedDays || '', isSuspended: !!d.isSuspended, airTime: d.airTime || '', expectedDate: d.expectedDate ? d.expectedDate.slice(0, 10) : '',
      expectedPrecision: d.expectedPrecision || 'day',
      totalEpisodes: d.totalEpisodes || 0, currentEpisode: (d.manualEpisode != null ? d.manualEpisode : d.currentEpisode) || 0, manualEpisode: d.manualEpisode || 0,
      isCompleted: d.isCompleted, startDate: d.startDate ? d.startDate.slice(0, 10) : '',
      sortOrder: d.sortOrder,
      videoUrl: d.videoUrl || '', videoLabel: d.videoLabel || '',
      seriesGroup: d.seriesGroup || '', seriesOrder: d.seriesOrder || 0,
      episodesPerDay: d.episodesPerDay || 1, premiereEpisodes: d.premiereEpisodes ?? null,
      imagePosition: d.imagePosition || 'center',
      originalTitle: d.originalTitle || '',
      scheduleImage: d.scheduleImage || '',
    })
    // 加载剧照
    try {
      const raw = d.galleryImages as string | null
      setGalleryImages(raw ? JSON.parse(raw) : [])
    } catch { setGalleryImages([]) }
    setCoverRotation(0)
    setGalleryRotations({})
    // 填充下载链接
    const slots = getDefaultSlots()
    if (d.downloadLinks) {
      for (const link of d.downloadLinks) {
        const idx = slots.findIndex(s => s.platform === link.platform)
        if (idx >= 0) {
          slots[idx].url = link.url
          slots[idx].extractCode = link.extractCode || ''
        }
      }
    }
    setDownloadSlots(slots)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await fetch(`/api/drama/${deleteTarget.id}`, { method: 'DELETE' })
    setDeleteTarget(null)
    load()
  }

  const handlePinTop = async (d: Drama) => {
    const minOrder = Math.min(...dramas.map(x => x.sortOrder), 0)
    await fetch(`/api/drama/${d.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pinTop', sortOrder: minOrder - 1 }),
    })
    load()
  }

  const handleComplete = async () => {
    if (!completeTarget) return
    await fetch(`/api/drama/${completeTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete' }),
    })
    setCompleteTarget(null)
    load()
  }

  // 通过 Canvas 物理旋转图片后重新上传，返回新 URL（旋转后宽度/高度对调）
  const rotateImageFile = async (src: string, degrees: 90 | 180 | 270): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const isClockwise = degrees === 90
        const w = isClockwise || degrees === 270 ? img.height : img.width
        const h = isClockwise || degrees === 270 ? img.width : img.height
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.translate(w / 2, h / 2)
        ctx.rotate(degrees * Math.PI / 180)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        canvas.toBlob(async (blob) => {
          if (!blob) { resolve(null); return }
          const file = new File([blob], `rotated-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' })
          const url = await uploadFile(file)
          resolve(url)
        }, 'image/jpeg', 0.92)
      }
      img.onerror = () => resolve(null)
      img.src = src
    })
  }

  // 旋转封面：上传后立刻替换 form.coverImage
  const handleRotateCover = async () => {
    if (!form.coverImage) return
    const prevUrl = form.coverImage
    const newUrl = await rotateImageFile(prevUrl, 90)
    if (newUrl) {
      setForm(prev => ({ ...prev, coverImage: newUrl }))
      setCoverRotation(0)
    }
  }

  // 旋转剧照：替换该位置的 url（顺序不变）
  const handleRotateGallery = async (idx: number) => {
    const url = galleryImages[idx]
    if (!url) return
    const newUrl = await rotateImageFile(url, 90)
    if (newUrl) {
      setGalleryImages(prev => {
        const next = [...prev]
        next[idx] = newUrl
        return next
      })
      // 同步清除该 url 的 rotation 状态（避免脏数据）
      setGalleryRotations(prev => {
        const { [url]: _, ...rest } = prev
        return rest
      })
    }
  }

  const uploadFile = async (file: File): Promise<string | null> => {
    const fd = new FormData(); fd.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      return data.url || null
    } catch { return null }
  }

  // 从拖拽 DataTransfer 中提取图片 URL（网页拖来的图片）
  const extractImageUrlFromDrag = (dt: DataTransfer): string | null => {
    // 优先从 HTML 中提取 <img src>
    const html = dt.getData('text/html')
    if (html) {
      const m = html.match(/<img[^>]+src=["']([^"']+)["']/i)
      if (m) return m[1]
    }
    // text/uri-list（某些浏览器）
    const uriList = dt.getData('text/uri-list')
    if (uriList) {
      const urls = uriList.split('\n').filter(u => u.trim() && !u.startsWith('#'))
      if (urls.length > 0) return urls[0].trim()
    }
    // text/plain 纯 URL
    const text = dt.getData('text/plain')
    if (text && /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)/i.test(text.trim())) {
      return text.trim()
    }
    return null
  }

  // 从远程 URL 上传图片（服务端下载）
  const uploadFromUrl = async (imageUrl: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/upload/from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: imageUrl }),
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.url || null
    } catch { return null }
  }

  // 拖拽处理器：本地文件走 uploadFile，网页图片走 uploadFromUrl
  const handleDropUpload = async (e: React.DragEvent, mode: 'cover' | 'gallery') => {
    // 原生捕获阶段已处理过，跳过避免双次上传
    if (e.nativeEvent.defaultPrevented) return
    e.preventDefault()
    e.stopPropagation()
    setDragOverZone(null)
    // 本地文件
    if (e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type === '' || f.type.startsWith('image/'))
      if (files.length === 0) return
      if (mode === 'cover') {
        const url = await uploadFile(files[0])
        if (url) setCoverImage(url)
        for (let i = 1; i < files.length; i++) {
          const u = await uploadFile(files[i])
          if (u) setGalleryImages(prev => [...prev, u])
        }
      } else {
        for (const f of files) {
          const u = await uploadFile(f)
          if (u) setGalleryImages(prev => [...prev, u])
        }
      }
      return
    }
    // 网页拖来的图片 URL
    const imageUrl = extractImageUrlFromDrag(e.dataTransfer)
    if (!imageUrl) return
    if (mode === 'cover') {
      const url = await uploadFromUrl(imageUrl)
      if (url) setCoverImage(url)
    } else {
      const url = await uploadFromUrl(imageUrl)
      if (url) setGalleryImages(prev => [...prev, url])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }

  // 带区域标记的 dragover（用于高亮）
  const handleDragOverZone = (zone: string) => (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    if (dragOverZone !== zone) setDragOverZone(zone)
  }

  const handleDragLeaveZone = (e: React.DragEvent) => {
    // 只在离开最外层容器时清除
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverZone(null)
    }
  }

  const handleUploadMultiple = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const urls: string[] = []
    for (const f of files) {
      const url = await uploadFile(f)
      if (url) urls.push(url)
    }
    if (urls.length > 0) {
      // 已有封面 → 全部进相册；没有封面 → 第1张当封面，其余进相册
      if (form.coverImage) {
        setGalleryImages(prev => [...prev, ...urls])
      } else {
        setGalleryImages(prev => [...prev, ...urls.slice(1)])
        setForm(prev => ({ ...prev, coverImage: urls[0] }))
      }
    }
    // 清空 input 以便重复选同一批文件
    e.target.value = ''
  }

  // 封面专用上传：第一张替换封面，其余进剧照（区别于相册的"有封面就全进相册"）
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const urls: string[] = []
    for (const f of files) {
      const url = await uploadFile(f)
      if (url) urls.push(url)
    }
    if (urls.length > 0) {
      setCoverImage(urls[0])
      if (urls.length > 1) {
        setGalleryImages(prev => [...prev, ...urls.slice(1)])
      }
    }
    e.target.value = ''
  }

  const removeGalleryImage = (idx: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== idx))
  }

  const setCoverFromGallery = (url: string) => {
    // 从相册选中 → 设为封面，旧封面入相册（合并更新）
    setGalleryImages(prev => {
      const filtered = prev.filter(u => u !== url)
      if (form.coverImage && form.coverImage !== url && !filtered.includes(form.coverImage)) {
        return [form.coverImage, ...filtered]
      }
      return filtered
    })
    setForm(prev => ({ ...prev, coverImage: url }))
  }

  const setCoverImage = (url: string) => {
    // 旧封面移入相册
    if (form.coverImage && form.coverImage !== url) {
      setGalleryImages(prev => {
        if (!prev.includes(form.coverImage)) {
          return [form.coverImage, ...prev]
        }
        return prev
      })
    }
    setForm(prev => ({ ...prev, coverImage: url }))
  }

  // 保持 refs 指向最新函数，供原生事件监听器使用
  uploadFileRef.current = uploadFile
  uploadFromUrlRef.current = uploadFromUrl
  setCoverImageRef.current = setCoverImage
  setGalleryImagesRef.current = setGalleryImages

  // 原生拖拽事件（捕获阶段）：绕过 React 合成事件的 stopPropagation 干扰
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-drop-zone]')) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
      if (target.closest('[data-drop-zone="cover"]')) {
        setDragOverZone('cover')
      } else if (target.closest('[data-drop-zone="gallery"]')) {
        setDragOverZone('gallery')
      }
    }

    const onDrop = async (e: DragEvent) => {
      const target = e.target as HTMLElement
      const coverZone = target.closest('[data-drop-zone="cover"]')
      const galleryZone = target.closest('[data-drop-zone="gallery"]')
      if (!coverZone && !galleryZone) return

      e.preventDefault()
      e.stopPropagation()
      setDragOverZone(null)
      dragCounterRef.current = 0

      const mode: 'cover' | 'gallery' = coverZone ? 'cover' : 'gallery'

      // 内部排序拖拽不处理
      if (mode === 'gallery' && dragIdx !== null) return

      const dt = e.dataTransfer
      if (!dt) return

      // 本地文件（桌面拖入、或 Chrome 从网页自动下载）
      if (dt.files.length > 0) {
        const files = Array.from(dt.files).filter(f => f.type === '' || f.type.startsWith('image/'))
        if (files.length === 0) return
        if (mode === 'cover') {
          const url = await uploadFileRef.current(files[0])
          if (url) setCoverImageRef.current(url)
          for (let i = 1; i < files.length; i++) {
            const u = await uploadFileRef.current(files[i])
            if (u) setGalleryImagesRef.current(prev => [...prev, u])
          }
        } else {
          for (const f of files) {
            const u = await uploadFileRef.current(f)
            if (u) setGalleryImagesRef.current(prev => [...prev, u])
          }
        }
        return
      }

      // 网页拖来的图片 URL（跨域时 files 可能为空，需从 HTML/URI 提取）
      let imageUrl: string | null = null
      const html = dt.getData('text/html')
      if (html) {
        const m = html.match(/<img[^>]+src=["']([^"']+)["']/i)
        if (m) imageUrl = m[1]
      }
      if (!imageUrl) {
        const uriList = dt.getData('text/uri-list')
        if (uriList) {
          const urls = uriList.split('\n').filter(u => u.trim() && !u.startsWith('#'))
          if (urls.length > 0) imageUrl = urls[0].trim()
        }
      }
      if (!imageUrl) {
        const text = dt.getData('text/plain')
        if (text && /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)/i.test(text.trim())) {
          imageUrl = text.trim()
        }
      }
      if (!imageUrl) return

      const uploadedUrl = await uploadFromUrlRef.current(imageUrl)
      if (uploadedUrl) {
        if (mode === 'cover') {
          setCoverImageRef.current(uploadedUrl)
        } else {
          setGalleryImagesRef.current(prev => [...prev, uploadedUrl])
        }
      }
    }

    const onDragEnter = (e: DragEvent) => {
      if (!(e.target as HTMLElement).closest('[data-drop-zone]')) return
      dragCounterRef.current++
    }

    const onDragLeave = (e: DragEvent) => {
      if (!(e.target as HTMLElement).closest('[data-drop-zone]')) return
      dragCounterRef.current--
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0
        setDragOverZone(null)
      }
    }

    // 使用捕获阶段，确保在任何 React 合成事件之前处理
    document.addEventListener('dragover', onDragOver, true)
    document.addEventListener('drop', onDrop, true)
    document.addEventListener('dragenter', onDragEnter, true)
    document.addEventListener('dragleave', onDragLeave, true)
    return () => {
      document.removeEventListener('dragover', onDragOver, true)
      document.removeEventListener('drop', onDrop, true)
      document.removeEventListener('dragenter', onDragEnter, true)
      document.removeEventListener('dragleave', onDragLeave, true)
    }
  }, [dragIdx])

  // 粘贴图片上传
  const handleImagePaste = async (e: React.ClipboardEvent, mode: 'cover' | 'gallery' | 'scheduleImage') => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (!file) return
        const url = await uploadFile(file)
        if (!url) return
        if (mode === 'cover') {
          setCoverImage(url)
        } else if (mode === 'scheduleImage') {
          setForm(prev => ({ ...prev, scheduleImage: url }))
        } else {
          setGalleryImages(prev => [...prev, url])
        }
        return
      }
    }
  }

  const toggleDay = (day: string) => {
    const days = form.airDays ? form.airDays.split(',').filter(Boolean) : []
    const idx = days.indexOf(day)
    if (idx >= 0) days.splice(idx, 1)
    else days.push(day)
    const newAirDays = days.join(',')
    // 即将上线 + 设了更新日 → 自动勾选追剧日历
    setForm({ ...form, airDays: newAirDays, ...(form.isUpcoming && newAirDays ? { isOnSchedule: true } : {}) })
  }

  const toggleRegion = (region: string) => {
    const selected = form.region ? form.region.split(',').filter(Boolean) : []
    const idx = selected.indexOf(region)
    if (idx >= 0) selected.splice(idx, 1)
    else selected.push(region)
    setForm({ ...form, region: selected.join(',') })
  }

  const toggleNewlyAired = (checked: boolean) => {
    // 勾选「最新上线」时，互斥取消「即将上线」
    setForm({ ...form, isNewlyAired: checked, isUpcoming: checked ? false : form.isUpcoming })
  }

  const toggleUpcoming = (checked: boolean) => {
    // 勾选「即将上线」时，互斥取消「最新上线」；且有更新日 → 自动勾选「追剧日历」
    setForm({
      ...form,
      isUpcoming: checked,
      isNewlyAired: checked ? false : form.isNewlyAired,
      ...(checked && form.airDays ? { isOnSchedule: true } : {}),
      ...(checked && form.startDate && !form.expectedDate ? { expectedDate: form.startDate } : {}),
    })
  }

  const filtered = dramas.filter(d => {
    if (filter === 'schedule' && !d.isOnSchedule) return false
    if (filter === 'new' && !d.isNewlyAired) return false
    if (filter === 'upcoming' && !d.isUpcoming) return false
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !(d.region || '').toLowerCase().includes(search.toLowerCase()) && !(d.originalTitle || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    if (sortOrder === 'updated') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    if (sortOrder === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  if (loading) return <p className="text-[var(--text-muted)]">加载中...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">影视管理</h1>

      {/* 表单 */}
      <form ref={formRef} onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT' && (e.target as HTMLInputElement).type !== 'submit' && !(e.target as HTMLElement).closest('[data-allow-enter]')) {
            e.preventDefault()
          }
        }}
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{editing ? '编辑剧集' : '添加剧集'}</h2>
          {editing && (
            <button type="button" onClick={() => { resetForm(); window.location.hash = '' }}
              className="text-xs px-2.5 py-1 rounded-full bg-[var(--brand-pale)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white transition-all">
              ← 返回新建
            </button>
          )}
        </div>

        {/* 基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">中文剧名 <span className="text-[var(--text-muted)]">（选填）</span></label>
            <input value={form.title} onChange={e => { setForm({ ...form, title: e.target.value }); searchDuplicates(e.target.value) }} placeholder="留空则使用外文原名"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
            {dupResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg z-20 overflow-hidden">
                {dupResults.map(d => (
                  <button key={d.id} type="button" onClick={() => {
                    window.location.hash = d.id
                    handleEdit(d)
                    setDupResults([])
                  }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--bg-secondary)] transition-colors border-b border-[var(--border)] last:border-b-0 text-left">
                    <span className="text-[var(--brand)] font-medium shrink-0">{d.title}</span>
                    {d.originalTitle && <span className="text-[var(--text-muted)] text-xs truncate">{d.originalTitle}</span>}
                    <span className="text-xs text-orange-500 ml-auto shrink-0">跳转编辑 →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">外文原名 <span className="text-[var(--text-muted)]">（选填）</span></label>
            <input value={form.originalTitle || ''} onChange={e => { setForm({ ...form, originalTitle: e.target.value }); searchDuplicates(e.target.value) }} placeholder="如：Cherm Chey The Series"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
          </div>
          <div className="hidden">
            {/* 兼容旧逻辑：至少一个不为空 */}
            <input required value={form.title || form.originalTitle || 'placeholder'} readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">地区 <span className="text-[10px] text-[var(--text-muted)]">（可多选）</span></label>
            <div className="flex flex-wrap gap-1.5">
              {regionOptions.map(r => {
                const selected = (form.region || '').split(',').filter(Boolean)
                return (
                  <button key={r} type="button" onClick={() => toggleRegion(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      selected.includes(r) ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)]'
                    }`}>
                    {r}
                  </button>
                )
              })}
            </div>
            {/* 标签 — 利用地区下方空间 */}
            <label className="block text-sm font-medium text-[var(--text-secondary)] mt-3 mb-1">标签</label>
            <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="例：AI剧" data-allow-enter
              onKeyDown={e => {
                if (e.key === 'Enter' && form.tags && !tagHistory.includes(form.tags)) {
                  const updated = [form.tags, ...tagHistory].slice(0, 10)
                  setTagHistory(updated)
                  localStorage.setItem('tagHistory', JSON.stringify(updated))
                }
              }}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]" />
            {tagHistory.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tagHistory.map(tag => (
                  <span key={tag}
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs transition-colors cursor-pointer ${
                      form.tags === tag ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}>
                    <span onClick={() => setForm({ ...form, tags: tag })}>{tag}</span>
                    <button type="button" onClick={(e) => {
                      e.stopPropagation()
                      const updated = tagHistory.filter(t => t !== tag)
                      setTagHistory(updated)
                      localStorage.setItem('tagHistory', JSON.stringify(updated))
                    }} className="ml-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-black/20 transition-colors">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* 日历海报 — 标签下方 */}
            <label className="block text-sm font-medium text-[var(--text-secondary)] mt-3 mb-1">日历海报</label>
            <div className="flex gap-2">
              <input value={form.scheduleImage} onChange={e => setForm({ ...form, scheduleImage: e.target.value })} onPaste={e => handleImagePaste(e, 'scheduleImage')} placeholder="粘贴图片URL"
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]" />
              <label className="px-3 py-2 rounded-lg bg-[var(--brand-pale)] text-[var(--brand)] text-sm font-medium cursor-pointer hover:bg-[var(--brand)] hover:text-white transition-all shrink-0">
                上传
                <input type="file" accept="image/*" className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0]; if (!file) return
                    const fd = new FormData(); fd.append('file', file)
                    try {
                      const r = await fetch('/api/upload', { method: 'POST', body: fd })
                      const d = await r.json(); if (d.url) setForm(f => ({ ...f, scheduleImage: d.url }))
                    } catch { /* ignore */ }
                  }} />
              </label>
            </div>
            {form.scheduleImage && (
              <div className="mt-1.5 relative inline-block">
                <img src={form.scheduleImage} alt="海报" className="max-h-[80px] rounded border border-[var(--border)]" />
                <button type="button" onClick={() => setForm(f => ({ ...f, scheduleImage: '' }))} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">×</button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">封面 / 剧照 <span className="text-[var(--text-muted)]">（可多选、拖入图片即上传）</span></label>
            <div data-drop-zone="cover"
              className={`flex gap-2 p-2 -m-2 rounded-lg transition-colors ${dragOverZone === 'cover' ? 'bg-[var(--brand-pale)] ring-2 ring-[var(--brand)]' : ''}`}
              onDragOver={handleDragOverZone('cover')} onDragLeave={handleDragLeaveZone} onDrop={e => handleDropUpload(e, 'cover')}>
              <label className="px-3 py-2 rounded-lg bg-[var(--brand-pale)] text-[var(--brand)] text-sm font-medium cursor-pointer hover:bg-[var(--brand)] hover:text-white transition-all shrink-0">
                上传图片
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleCoverUpload} />
              </label>
              <input value={form.coverImage} onChange={e => setCoverImage(e.target.value)} onPaste={e => handleImagePaste(e, 'cover')} placeholder="或拖入图片 / 粘贴URL"
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]" />
            </div>

            {/* 封面预览 */}
            {form.coverImage && (
              <div className="mt-2 flex items-start gap-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1.5">拖动调整封面位置</p>
                  <div ref={previewRef} data-drop-zone="cover"
                    className={`relative aspect-[2/3] w-28 rounded-lg overflow-hidden border-2 cursor-crosshair touch-none select-none transition-colors ${dragOverZone === 'cover' ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]' : 'border-[var(--brand)]'}`}
                    onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
                    onDragOver={handleDragOverZone('cover')} onDragLeave={handleDragLeaveZone} onDrop={e => handleDropUpload(e, 'cover')}>
                    <img src={form.coverImage} alt="拖动调整" className="w-full h-full object-cover pointer-events-none"
                      style={{ objectPosition: dragging ? `${dragPos.x}% ${dragPos.y}%` : (form.imagePosition || 'center'), transform: `rotate(${coverRotation}deg)` }} />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <svg className={`w-6 h-6 transition-colors ${dragging ? 'text-white' : 'text-white/50'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="3" strokeWidth="1.5" /><path d="M12 2v6m0 8v6M2 12h6m8 0h6" strokeWidth="1" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 text-center">{form.imagePosition || 'center'}</p>
                  <button type="button" onClick={handleRotateCover}
                    className="mt-1 w-full px-2 py-1 rounded-lg border border-[var(--border)] text-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)] transition-all flex items-center justify-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 4v6h6M23 4v6h-6M23 20v-6h-6M1 20v-6h6M3.5 16a8.5 8.5 0 1114.2-5.7" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12a8 8 0 11-5.3-7.5" /></svg>
                    旋转 90°
                  </button>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1.5">快捷定位</p>
                  <div className="grid grid-cols-3 gap-1 w-[84px]">
                    {[['left top','top','right top'],['left','center','right'],['left bottom','bottom','right bottom']].map((row, ri) => row.map((pos) => (
                      <button key={pos} type="button" onClick={() => setForm(prev => ({ ...prev, imagePosition: pos }))}
                        className={`w-[26px] h-[26px] rounded border text-[9px] transition-colors ${form.imagePosition === pos && !dragging ? 'bg-[var(--brand)] border-[var(--brand)] text-white' : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--brand)]'}`} title={pos}>
                        {pos === 'center' ? '中' : pos === 'top' ? '上' : pos === 'bottom' ? '下' : pos === 'left' ? '左' : pos === 'right' ? '右' : pos === 'left top' ? '↖' : pos === 'right top' ? '↗' : pos === 'left bottom' ? '↙' : '↘'}
                      </button>
                    )))}
                  </div>
                  <button type="button" onClick={() => {
                    if (form.coverImage) {
                      setGalleryImages(prev => [form.coverImage, ...prev])
                    }
                    setForm(prev => ({ ...prev, coverImage: '' }))
                  }} className="mt-2 px-3 py-1 rounded-lg border border-red-200 text-xs text-red-500 hover:bg-red-50 transition-all">移除封面（进入相册）</button>
                </div>
              </div>
            )}

            {/* 剧照相册 */}
            <div data-drop-zone="gallery"
              className={`mt-3 p-2 -m-2 rounded-lg transition-colors ${dragOverZone === 'gallery' ? 'bg-[var(--brand-pale)] ring-2 ring-[var(--brand)]' : ''}`}
              onDragOver={handleDragOverZone('gallery')} onDragLeave={handleDragLeaveZone}
              onDrop={e => {
                // 内部排序拖拽不处理
                if (dragIdx !== null) { setDragOverZone(null); return }
                handleDropUpload(e, 'gallery')
              }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">📸 剧照相册</span>
                <label className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--brand-pale)] text-[var(--brand)] text-xs font-medium cursor-pointer hover:bg-[var(--brand)] hover:text-white transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  上传图片
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadMultiple} />
                </label>
              </div>
              {galleryImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {galleryImages.map((url, idx) => (
                    <div
                      key={url}
                      draggable
                      onDragStart={(e) => {
                        setDragIdx(idx)
                        e.dataTransfer.effectAllowed = 'move'
                        const img = e.currentTarget.querySelector('img') as HTMLImageElement | null
                        if (img) e.dataTransfer.setDragImage(img, img.width / 2, img.height / 2)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        e.dataTransfer.dropEffect = 'move'
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (dragIdx !== null && dragIdx !== idx) {
                          setGalleryImages(prev => {
                            const next = [...prev]
                            const [moved] = next.splice(dragIdx, 1)
                            next.splice(idx, 0, moved)
                            return next
                          })
                          setDragIdx(idx)
                        }
                      }}
                      onDragEnd={() => setDragIdx(null)}
                      className={`relative group cursor-grab active:cursor-grabbing transition-all ${
                        dragIdx === idx ? 'opacity-40 scale-95' : ''
                      }`}
                    >
                      <div className="aspect-[2/3] rounded-lg overflow-hidden border border-[var(--border)] group-hover:border-[var(--brand)] transition-colors">
                        <img src={url} alt={`剧照 ${idx + 1}`} className="w-full h-full object-cover pointer-events-none"
                          style={{ transform: `rotate(${galleryRotations[url] || 0}deg)` }} />
                      </div>
                      {/* 序号角标 */}
                      <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] font-bold flex items-center justify-center pointer-events-none">
                        {idx + 1}
                      </span>
                      {/* Hover 操作层 */}
                      <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                        <button type="button" onClick={() => setCoverFromGallery(url)}
                          className="px-2.5 py-1 rounded-md bg-white/90 text-xs font-medium text-gray-800 hover:bg-yellow-400 transition-colors shadow"
                          title="设为封面">
                          ★ 设为封面
                        </button>
                        <button type="button" onClick={() => handleRotateGallery(idx)}
                          className="px-2.5 py-1 rounded-md bg-white/90 text-xs font-medium text-gray-800 hover:bg-blue-400 hover:text-white transition-colors shadow"
                          title="旋转90度">
                          ↻ 旋转
                        </button>
                        <button type="button" onClick={() => removeGalleryImage(idx)}
                          className="px-2.5 py-1 rounded-md bg-white/90 text-xs font-medium text-red-600 hover:bg-red-500 hover:text-white transition-colors shadow"
                          title="删除">
                          × 删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-[var(--border)] rounded-xl">
                  <p className="text-sm text-[var(--text-muted)] mb-2">📷 尚无剧照</p>
                  <p className="text-xs text-[var(--text-muted)]">拖入图片、上传或粘贴 URL，封面替换后旧图会自动收入相册</p>
                </div>
              )}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">简介</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={5}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
          </div>
          </div>

        {/* 显示板块 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">显示板块</label>
          <div className="flex gap-4">
            {[
              { key: 'isOnSchedule', label: '追剧日历' },
              { key: 'isNewlyAired', label: '最新上线' },
              { key: 'isUpcoming', label: '即将上线' },
            ].map(item => (
              <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(form as Record<string, unknown>)[item.key] as boolean}
                  onChange={e => {
                    const checked = e.target.checked
                    if (item.key === 'isUpcoming') {
                      // 勾选「即将上线」时，互斥取消「最新上线」；且有更新日 → 自动勾选「追剧日历」
                      setForm({
                        ...form,
                        isUpcoming: checked,
                        isNewlyAired: checked ? false : form.isNewlyAired,
                        ...(checked && form.airDays ? { isOnSchedule: true } : {}),
                        ...(checked && form.startDate && !form.expectedDate ? { expectedDate: form.startDate } : {}),
                      })
                    } else if (item.key === 'isNewlyAired') {
                      // 勾选「最新上线」时，互斥取消「即将上线」
                      setForm({
                        ...form,
                        isNewlyAired: checked,
                        isUpcoming: checked ? false : form.isUpcoming,
                      })
                    } else if (item.key === 'isOnSchedule' && checked && !form.airDays) {
                      // 勾选「追剧日历」且未设更新日 → 根据首播日期自动选周几
                      const dateStr = form.expectedDate || form.startDate
                      if (dateStr) {
                        const d = new Date(dateStr)
                        const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1
                        setForm({ ...form, isOnSchedule: true, airDays: String(dayIdx) })
                      } else {
                        setForm({ ...form, isOnSchedule: true })
                      }
                    } else {
                      setForm({ ...form, [item.key]: checked })
                    }
                  }}
                  className="w-4 h-4 accent-[var(--brand)]" />
                <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 类型 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">类型</label>
          <div className="flex gap-4">
            {[
              { value: 'tv', label: '电视剧' },
              { value: 'movie', label: '电影' },
              { value: 'variety', label: '综艺' },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="category" value={opt.value} checked={(form.category || 'tv') === opt.value}
                  onChange={() => setForm({ ...form, category: opt.value })}
                  className="w-4 h-4 accent-[var(--brand)]" />
                <span className="text-sm text-[var(--text-primary)]">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 已完结剧 */}
        <div className="mb-4 flex items-center gap-2">
          <input
            id="isCompleted"
            type="checkbox"
            checked={form.isCompleted}
            onChange={e => {
              const checked = e.target.checked
              const total = form.totalEpisodes || 0
              setForm({
                ...form,
                isCompleted: checked,
                isOnSchedule: checked ? false : form.isOnSchedule,
                isNewlyAired: checked ? false : form.isNewlyAired,
                isUpcoming: checked ? false : form.isUpcoming,
                ...(checked && total > 0 ? { currentEpisode: total } : {}),
              })
            }}
            className="w-4 h-4 accent-[var(--brand)] cursor-pointer"
          />
          <label htmlFor="isCompleted" className="text-sm font-medium text-[var(--text-secondary)] cursor-pointer select-none">
            已完结（老剧补录）
          </label>
        </div>
        {form.isCompleted && (
          <div className="mb-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">上映日期</label>
                <input type="date" value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">总集数</label>
                <input type="number" min={1} value={form.totalEpisodes || ''} placeholder="例如 24"
                  onChange={e => { const v = parseInt(e.target.value) || 0; setForm({ ...form, totalEpisodes: v }) }}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
              </div>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-2">老剧完结后，按地区正常显示。后续可根据上映日期做年份检索。</p>
          </div>
        )}

        {/* 追剧日历设置 */}
        {form.isOnSchedule && (
          <div className="mb-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">更新日</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {dayOptions.map(d => (
                <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${form.airDays?.includes(d.value) ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>
                  {d.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setShowPause((prev: boolean) => !prev)}
              className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors mb-2">
              <span>停播设置</span>
              <svg className={`w-3 h-3 transition-transform ${showPause ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showPause && (
            <div className="mb-3 p-3 border border-red-200 rounded-lg bg-red-50/30">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">本周停播日 <span className="text-[10px] text-[var(--text-muted)]">（选中则当天不更新，日历显示"停播"）</span></label>
            <div className="flex flex-wrap gap-2 mb-3">
              {dayOptions.map(d => (
                <button key={d.value} type="button" onClick={() => {
                  const days = form.pausedDays ? form.pausedDays.split(',').filter(Boolean) : []
                  const idx = days.indexOf(d.value)
                  if (idx >= 0) days.splice(idx, 1)
                  else days.push(d.value)
                  setForm({ ...form, pausedDays: days.join(',') })
                }}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${form.pausedDays?.includes(d.value) ? 'bg-red-500 text-white' : 'bg-[var(--bg)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>
                  {d.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isSuspended} onChange={e => setForm({ ...form, isSuspended: e.target.checked })} className="w-4 h-4 accent-red-500" />
              <span className="text-sm text-red-500 font-medium">暂缓播出（播出时间另行通知）</span>
            </label>
            </div>
            )}
            <div className="flex gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">更新时间</label>
                <input type="time" value={form.airTime} onChange={e => setForm({ ...form, airTime: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">每日更新集数</label>
                <input type="number" value={form.episodesPerDay || 1} min={1} max={10} onChange={e => setForm({ ...form, episodesPerDay: parseInt(e.target.value) || 1 })}
                  className="w-24 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">首播集数 <span className="text-[var(--text-muted)] font-normal">(和平时一样不用填)</span></label>
                <input type="number" value={form.premiereEpisodes || ''} min={1} max={20} placeholder="同每日"
                  onChange={e => { const v = parseInt(e.target.value); setForm({ ...form, premiereEpisodes: v || null }) }}
                  className="w-24 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
              </div>
            </div>
          </div>
        )}

        {/* 即将上线日期 */}
        {form.isUpcoming && (
          <div className="mb-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">预计上线日期</label>
                {form.expectedPrecision === 'tbd' ? (
                  <div className="flex items-center h-10 px-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                    <span className="text-sm text-[var(--text-muted)]">敬请期待</span>
                  </div>
                ) : form.expectedPrecision === 'year' ? (
                  <input type="number" value={form.expectedDate ? form.expectedDate.slice(0, 4) : ''} onChange={e => {
                    const y = e.target.value
                    setForm({ ...form, expectedDate: y ? `${y}-01-01` : '' })
                  }} placeholder="例如：2026" min={2024} max={2100}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
                ) : form.expectedPrecision === 'month' ? (
                  <input type="month" value={form.expectedDate ? form.expectedDate.slice(0, 7) : ''} onChange={e => {
                    const m = e.target.value
                    setForm({ ...form, expectedDate: m ? `${m}-01` : '' })
                  }}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
                ) : (
                  <input type="date" value={form.expectedDate} onChange={e => {
                    const expectedDate = e.target.value
                    // 自动识别周几 → 设为更新日
                    let airDays = form.airDays
                    if (expectedDate) {
                      const jsDay = new Date(expectedDate + 'T00:00:00').getDay()
                      airDays = String(jsDay === 0 ? 6 : jsDay - 1)
                    }
                    setForm({ ...form, expectedDate, airDays, ...(expectedDate ? { startDate: expectedDate } : {}) })
                  }}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">日期精度</label>
                <select value={form.expectedPrecision} onChange={e => {
                  const val = e.target.value
                  setForm({ ...form, expectedPrecision: val, ...(val === 'tbd' ? { expectedDate: '' } : {}) })
                }}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]">
                  <option value="tbd">敬请期待</option>
                  <option value="day">精确日期</option>
                  <option value="month">只选月份</option>
                  <option value="year">只选年份</option>
                </select>
              </div>
            </div>

            {/* 精确日期时，可设置播出时间和更新日 */}
            {form.expectedPrecision === 'day' && (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">更新日（首播后自动进入追剧日历）</label>
                  <div className="flex flex-wrap gap-2">
                    {dayOptions.map(d => (
                      <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${form.airDays?.includes(d.value) ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] mb-1 cursor-pointer">
                      <input type="checkbox" checked={!!form.airTime} onChange={e => {
                        setForm({ ...form, airTime: e.target.checked ? (form.airTime || '20:00') : '' })
                      }} className="w-3.5 h-3.5 accent-[var(--brand)]" />
                      我知道播出时间
                    </label>
                    {!!form.airTime && (
                      <input type="time" value={form.airTime} onChange={e => setForm({ ...form, airTime: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
                    )}
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] mb-1 cursor-pointer">
                      <input type="checkbox" checked={(form.episodesPerDay || 0) > 0} onChange={e => {
                        setForm({ ...form, episodesPerDay: e.target.checked ? 1 : 0 })
                      }} className="w-3.5 h-3.5 accent-[var(--brand)]" />
                      我知道每日更新集数
                    </label>
                    {(form.episodesPerDay || 0) > 0 && (
                      <input type="number" value={form.episodesPerDay} min={1} max={10} onChange={e => setForm({ ...form, episodesPerDay: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
                    )}
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] mb-1 cursor-pointer">
                      <input type="checkbox" checked={form.premiereEpisodes != null} onChange={e => {
                        setForm({ ...form, premiereEpisodes: e.target.checked ? (form.premiereEpisodes || 1) : null })
                      }} className="w-3.5 h-3.5 accent-[var(--brand)]" />
                      我知道首播集数
                    </label>
                    {form.premiereEpisodes != null && (
                      <input type="number" value={form.premiereEpisodes || ''} min={1} max={20} placeholder="首播当天放出集数"
                        onChange={e => { const v = parseInt(e.target.value); setForm({ ...form, premiereEpisodes: v || null }) }}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 集数 */}
        <div className="mb-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">总集数</label>
              <input type="number" value={form.totalEpisodes} onChange={e => {
                const total = parseInt(e.target.value) || 0
                setForm({ ...form, totalEpisodes: total })
              }}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">当前集数</label>
              <input type="number" value={form.currentEpisode} onChange={e => {
                const current = parseInt(e.target.value) || 0
                const total = form.totalEpisodes || 0
                setForm({ ...form, currentEpisode: current, manualEpisode: null, ...(total > 0 && current >= total ? { isCompleted: true } : {}) })
              }}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">手动覆盖集数 <span className="text-[10px] text-[var(--text-muted)]">（留空=自动，填了优先显示）</span></label>
              <input type="number" value={form.manualEpisode || ''} onChange={e => {
                const v = e.target.value ? parseInt(e.target.value) : null
                setForm({ ...form, manualEpisode: v, currentEpisode: v ?? form.currentEpisode })
              }}
                placeholder="不填则用当前集数"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">开播日期</label>
              <input type="date" value={form.startDate} onChange={e => {
                  const startDate = e.target.value
                  // 自动识别周几 → 设为更新日
                  let airDays = form.airDays
                  if (startDate && !airDays) {
                    const jsDay = new Date(startDate + 'T00:00:00').getDay()
                    airDays = String(jsDay === 0 ? 6 : jsDay - 1)
                  }
                  setForm({ ...form, startDate, airDays, ...(form.isUpcoming && startDate ? { expectedDate: startDate } : {}) })
                }}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isCompleted} onChange={e => { const checked = e.target.checked; const total = form.totalEpisodes || 0; setForm({ ...form, isCompleted: checked, ...(checked && total > 0 ? { currentEpisode: total } : {}) }) }} className="w-4 h-4 accent-[var(--brand)]" />
                <span className="text-sm text-[var(--text-secondary)]">已完结</span>
              </label>
            </div>
          </div>
        </div>

        {/* 系列关联 */}
        <div className="mb-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
          <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] mb-2 cursor-pointer">
            <input type="checkbox" checked={(form.seriesOrder || 0) > 0} onChange={e => {
              setForm({ ...form, seriesOrder: e.target.checked ? (form.seriesOrder || 1) : 0, seriesGroup: e.target.checked ? (form.seriesGroup || '') : '' })
            }} className="w-3.5 h-3.5 accent-[var(--brand)]" />
            这是系列剧
          </label>
          {(form.seriesOrder || 0) > 0 && (
            <div className="flex gap-2">
              <input value={form.seriesGroup} onChange={e => setForm({ ...form, seriesGroup: e.target.value })} placeholder="系列名，如：职业替身"
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]" />
              <input type="number" value={form.seriesOrder || ''} onChange={e => setForm({ ...form, seriesOrder: parseInt(e.target.value) || 0 })} placeholder="第几季"
                className="w-24 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]" />
            </div>
          )}
        </div>

        {/* 在线观看 */}
        <div className="mb-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">在线观看链接 <span className="text-[var(--text-muted)]">（支持 B站、微博，粘贴视频页面地址即可）</span></label>
          <div className="flex gap-2">
            <input value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} placeholder="例如：https://www.bilibili.com/video/BV1xx411c7mD"
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]" />
            <input value={form.videoLabel} onChange={e => setForm({ ...form, videoLabel: e.target.value })} placeholder="按钮文案，如：预告片、花絮"
              className="w-48 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]" />
          </div>
        </div>

        {/* 一键粘贴识别 */}
        <div className="mb-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">一键粘贴识别 <span className="text-[var(--text-muted)]">（把复制的网盘链接全部粘贴进来，自动识别分配）</span></label>
          <div className="flex gap-2">
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="把包含网盘链接的内容全部粘贴到这里&#10;比如：&#10;链接: https://pan.baidu.com/s/xxx 提取码: abcd&#10;https://pan.quark.cn/s/yyy&#10;https://drive.uc.cn/s/zzz&#10;https://pan.xunlei.com/s/aaa"
              rows={4}
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)] resize-none"
            />
            <button type="button" onClick={handlePasteParse}
              className="shrink-0 px-4 py-2 rounded-lg bg-[var(--brand-pale)] text-[var(--brand)] text-sm font-medium hover:bg-[var(--brand)] hover:text-white transition-all self-end">
              识别填充
            </button>
          </div>
        </div>

        {/* 下载链接 — 4个固定网盘位 */}
        <div className="mb-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">下载链接 <span className="text-[var(--text-muted)]">（填了URL才会显示在前台，提取码选填）</span></label>
          <div className="space-y-2">
            {downloadSlots.map((slot, idx) => (
              <div key={slot.platform} className="flex gap-2 items-center">
                <span className="w-20 text-sm text-[var(--text-secondary)] shrink-0">{slot.platform}</span>
                <input value={slot.url} onChange={e => {
                  const updated = [...downloadSlots]
                  updated[idx].url = e.target.value
                  setDownloadSlots(updated)
                }} placeholder="粘贴链接地址"
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]" />
                <input value={slot.extractCode} onChange={e => {
                  const updated = [...downloadSlots]
                  updated[idx].extractCode = e.target.value
                  setDownloadSlots(updated)
                }} placeholder="提取码（选填）"
                  className="w-36 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]" />
              </div>
            ))}
          </div>
        </div>

        {/* 排序 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">排序权重</label>
          <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
            className="w-40 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]" />
        </div>

        <div className="flex gap-2 items-center">
          <button type="submit" disabled={submitStatus === 'loading'}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              submitStatus === 'loading'
                ? 'bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed'
                : submitStatus === 'success'
                ? 'bg-green-100 text-green-700'
                : submitStatus === 'error'
                ? 'bg-red-100 text-red-600'
                : 'bg-[var(--brand-pale)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white'
            }`}>
            {submitStatus === 'loading' ? '提交中...' : submitStatus === 'success' ? '✓ 已保存' : submitStatus === 'error' ? '✗ 保存失败' : (editing ? '保存' : '添加')}
          </button>
          {submitError && (
            <span className="text-xs text-red-500">{submitError}</span>
          )}
          {editing && (
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-secondary)] transition-all">
              取消
            </button>
          )}
        </div>
      </form>

      {/* 搜索 + 筛选 */}
      <div className="flex gap-3 mb-4 items-center flex-wrap">
        <div className="flex gap-1.5">
          {[
            { key: 'all', label: '全部' },
            { key: 'schedule', label: '追剧日历' },
            { key: 'new', label: '最新上线' },
            { key: 'upcoming', label: '即将上线' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === tab.key ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              }`}>
              {tab.label}
            </button>
          ))}
          <span className="w-px h-6 bg-[var(--border)] self-center mx-1"></span>
          {[
            { key: 'updated' as const, label: '最新修改' },
            { key: 'newest' as const, label: '最新添加' },
            { key: 'oldest' as const, label: '按添加顺序' },
          ].map(s => (
            <button key={s.key} onClick={() => setSortOrder(s.key)}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                sortOrder === s.key ? 'text-[var(--brand)] bg-[var(--brand-pale)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索剧名或地区..."
          className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm w-48 focus:outline-none focus:border-[var(--brand)]" />
        <span className="text-xs text-[var(--text-muted)] shrink-0">{filtered.length} 部</span>
      </div>

      {/* 列表 */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
              <th className="text-center px-2 py-3 text-sm font-medium text-[var(--text-muted)] w-10">#</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">剧名</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">地区</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">板块</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">集数</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">下载</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, idx) => (
              <tr key={d.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="text-center px-2 py-3 text-sm text-[var(--text-muted)] tabular-nums">{filtered.length - idx}</td>
                <td className="px-4 py-3 text-sm text-[var(--text-primary)] font-medium">{d.title || d.originalTitle}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-1 flex-wrap">
                    {(d.region || '').split(',').filter(Boolean).map(r => (
                      <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--brand-pale)] text-[var(--brand)]">{r}</span>
                    ))}
                    {!d.region && <span className="text-[var(--text-muted)]">-</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {d.isOnSchedule && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">追剧</span>}
                    {d.isNewlyAired && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">新播</span>}
                    {d.isUpcoming && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">即将</span>}
                    {d.isCompleted && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">完结</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                  {d.totalEpisodes ? `${d.isCompleted ? d.totalEpisodes : (d.manualEpisode != null ? d.manualEpisode : (d.currentEpisode || calcAutoEpisode(d) || 0))}/${d.totalEpisodes}` : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                  {d.downloadLinks?.length ? `${d.downloadLinks.length} 个` : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  {!d.isCompleted && d.isOnSchedule && (
                    <button onClick={() => setCompleteTarget({ id: d.id, title: d.title })} className="px-2.5 py-1 rounded-lg border border-orange-200 text-xs text-orange-500 hover:bg-orange-50 transition-all mr-2">完结</button>
                  )}
                  <button onClick={() => handleEdit(d)} className="px-2.5 py-1 rounded-lg bg-[var(--brand-pale)] text-[var(--brand)] text-xs hover:bg-[var(--brand)] hover:text-white transition-all mr-2">编辑</button>
                  <button onClick={() => setDeleteTarget({ id: d.id, title: d.title })} className="px-2.5 py-1 rounded-lg border border-red-200 text-xs text-red-500 hover:bg-red-50 transition-all">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-8 text-[var(--text-muted)]">暂无剧集</div>}
      </div>

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">确认删除</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              确定要删除 <span className="font-semibold text-[var(--text-primary)]">「{deleteTarget.title}」</span> 吗？此操作不可撤销。
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--border)] transition-colors">取消</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">确定删除</button>
            </div>
          </div>
        </div>
      )}

      {/* 完结确认弹窗 */}
      {completeTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setCompleteTarget(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">标记已完结</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              确定将 <span className="font-semibold text-[var(--text-primary)]">「{completeTarget.title}」</span> 标记为已完结吗？一个月后将自动从追剧日历下架。
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setCompleteTarget(null)} className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--border)] transition-colors">取消</button>
              <button onClick={handleComplete} className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors">确定完结</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
