'use client'

import { useState, useEffect } from 'react'

type TabType = 'request' | 'share' | 'feedback'

interface RequestItem {
  id: string
  name: string
  type: string
  description?: string | null
  likes: number
  reply?: string | null
  isProcessed: boolean
  createdAt: string
}

const tabs: { key: TabType; label: string }[] = [
  { key: 'request', label: '许愿' },
  { key: 'share', label: '资源共享' },
  { key: 'feedback', label: '建议' },
]

export default function RequestPage() {
  const [activeTab, setActiveTab] = useState<TabType>('request')
  const [showForm, setShowForm] = useState(false)
  const [items, setItems] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null)

  // 表单
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formLink, setFormLink] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // 验证码
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaQuestion, setCaptchaQuestion] = useState<string | null>(null)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaError, setCaptchaError] = useState<string | null>(null)
  const [captchaLoading, setCaptchaLoading] = useState(false)

  const loadCaptcha = async () => {
    setCaptchaLoading(true)
    setCaptchaError(null)
    setCaptchaAnswer('')
    try {
      const res = await fetch('/api/captcha')
      const data = await res.json()
      setCaptchaToken(data.token)
      setCaptchaQuestion(data.question)
    } catch { setCaptchaError('获取验证码失败') }
    setCaptchaLoading(false)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) { setFormName(q); setShowForm(true); loadCaptcha() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 点赞
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try { const s = localStorage.getItem('wish-liked'); if (s) setLikedMap(JSON.parse(s)) } catch {}
  }, [])

  const load = async () => {
    const res = await fetch(`/api/requests?type=${activeTab}`)
    setItems(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [activeTab])

  const checkDailyLimit = async () => {
    const res = await fetch('/api/requests', { method: 'PUT' })
    const data = await res.json()
    setDailyRemaining(data.remaining)
    return data
  }

  const handleOpenForm = async () => {
    const { remaining } = await checkDailyLimit()
    if (remaining <= 0) {
      setFormError('提交次数过多，请明日再试')
      return
    }
    setSubmitted(false)
    setShowForm(true)
    loadCaptcha()
  }

  const resetForm = () => {
    setFormName('')
    setFormDesc('')
    setFormEmail('')
    setFormLink('')
    setFormCode('')
    setFormError('')
    setCaptchaToken(null)
    setCaptchaQuestion(null)
    setCaptchaAnswer('')
    setCaptchaError(null)
    setShowForm(false)
  }

  const validateEmail = (email: string) => {
    if (!email) return true
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
  }

  const triggerConfetti = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const colors = ['#D47060', '#E89080', '#FF6B6B', '#FFD700', '#4ECDC4', '#FFB347', '#DDA0DD', '#87CEEB']
    for (let i = 0; i < 12; i++) {
      const dot = document.createElement('div')
      const size = Math.random() * 6 + 4
      const angle = (Math.PI * 2 / 12) * i + Math.random() * 0.5
      const dist = Math.random() * 40 + 30
      const color = colors[Math.floor(Math.random() * colors.length)]
      Object.assign(dot.style, {
        position: 'fixed', left: cx + 'px', top: cy + 'px',
        width: size + 'px', height: size + 'px', borderRadius: '50%',
        background: color, zIndex: '9999', pointerEvents: 'none',
        transition: 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      })
      document.body.appendChild(dot)
      requestAnimationFrame(() => {
        dot.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0)`
        dot.style.opacity = '0'
      })
      setTimeout(() => dot.remove(), 600)
    }
  }

  const handleLike = async (id: string, name: string) => {
    const isLiked = likedMap[id]
    setLikedMap(prev => {
      const next = { ...prev }
      if (isLiked) delete next[id]
      else next[id] = true
      localStorage.setItem('wish-liked', JSON.stringify(next))
      return next
    })
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, likes: item.likes + (isLiked ? -1 : 1) } : item
    ))
    if (!isLiked) { const el = document.getElementById(`like-btn-${id}`); if (el) triggerConfetti(el) }
    await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'like', name, liked: isLiked }),
    })
  }

  const handleSubmit = async (e: React.FormEvent, confirmDup?: boolean) => {
    e.preventDefault()
    setFormError('')

    if (activeTab === 'request' && !formName.trim()) { setFormError('请输入资源名称'); return }
    if (activeTab === 'share' && (!formName.trim() || !formLink.trim())) { setFormError('请填写资源名称和链接'); return }
    if (formEmail && !validateEmail(formEmail)) { setFormError('请输入正确的邮箱格式'); return }

    if (!captchaToken || !captchaAnswer.trim()) { setFormError('请先完成验证码'); return }

    setFormLoading(true)

    const body: Record<string, string | boolean> = {
      type: activeTab,
      captchaToken,
      captchaAnswer: captchaAnswer.trim(),
    }
    if (confirmDup) body.confirmDuplicate = true

    if (activeTab === 'request') {
      body.name = formName; body.description = formDesc; body.email = formEmail
    } else if (activeTab === 'share') {
      body.name = formName; body.description = formDesc; body.email = formEmail
      body.linkUrl = formLink; body.linkExtractCode = formCode
    } else {
      body.name = formDesc?.slice(0, 30) || '意见反馈'; body.description = formDesc; body.email = formEmail
    }

    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    // 重复检测：弹窗确认
    if (res.status === 409 && data.duplicate) {
      setFormLoading(false)
      if (confirm(`「${data.existingName}」已经有人提交过了（${data.existingLikes} 人想要）\n\n要继续提交吗？你的提交会为这个心愿增加热度。`)) {
        handleSubmit(e, true)
      }
      return
    }

    // 确认提交重复
    if (data.confirmDuplicate) {
      setSubmitMsg('已为这个心愿增加热度！')
      setSubmitted(true)
      resetForm()
      loadCaptcha()
      load()
      setFormLoading(false)
      return
    }

    if (res.status === 429) {
      setFormError(data.error || '提交次数过多，请明日再试')
      setFormLoading(false)
      return
    } else if (!res.ok) {
      setFormError(data.error || '提交失败，请重试')
      if (res.status === 400 && data.error === '验证码错误') loadCaptcha()
      setFormLoading(false)
      return
    } else {
      const msgs: Record<string, string> = {
        request: '心愿已许下！审核通过后将公开展示',
        share: '感谢分享！你的资源仅有管理员可见，审核后会上架',
        feedback: '感谢你的建议！',
      }
      setSubmitMsg(msgs[activeTab] || '提交成功')
      setSubmitted(true)
      setDailyRemaining(data.remaining ?? null)
      resetForm()
      loadCaptcha()
      load()
    }
    setFormLoading(false)
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}天前`
    return new Date(dateStr).toLocaleDateString('zh-CN')
  }

  function renderCaptcha() {
    return (
      <div className="flex items-center gap-2">
        {captchaLoading ? (
          <span className="text-xs text-[var(--text-muted)]">获取验证码中...</span>
        ) : captchaQuestion ? (
          <>
            <span className="text-sm font-medium text-[var(--text-primary)] shrink-0">{captchaQuestion}</span>
            <input type="text" inputMode="numeric" value={captchaAnswer}
              onChange={e => { setCaptchaAnswer(e.target.value); setCaptchaError(null) }}
              placeholder="答案"
              className="w-20 text-base px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]" />
            <button type="button" onClick={loadCaptcha}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--brand)] shrink-0">换一个</button>
          </>
        ) : <span className="text-xs text-red-500">{captchaError || '验证码加载中...'}</span>}
      </div>
    )
  }

  // ========== 表单 ==========
  function renderForm() {
    if (!showForm) return null

    const formContent = (() => {
      if (activeTab === 'request') {
        return (
          <>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">许下一个心愿</h3>
            <input value={formName} onChange={e => setFormName(e.target.value)} required
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]"
              placeholder="资源名称（必填）" />
            <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]"
              placeholder="补充说明（选填）" />
            <input value={formEmail} onChange={e => setFormEmail(e.target.value)} type="email"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]"
              placeholder="邮箱，有资源了通知你（选填）" />
          </>
        )
      }
      if (activeTab === 'share') {
        return (
          <>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">分享你有的资源</h3>
            <input value={formName} onChange={e => setFormName(e.target.value)} required
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]"
              placeholder="资源名称（必填）" />
            <input value={formLink} onChange={e => setFormLink(e.target.value)} required
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]"
              placeholder="网盘链接（必填）" />
            <input value={formCode} onChange={e => setFormCode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]"
              placeholder="提取码（选填）" />
            <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]"
              placeholder="备注，比如字幕类型、清晰度等（选填）" />
            <input value={formEmail} onChange={e => setFormEmail(e.target.value)} type="email"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]"
              placeholder="邮箱，上架后通知你（选填）" />
          </>
        )
      }
      // feedback
      return (
        <>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">写下你的建议</h3>
          <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={4} required
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]"
            placeholder="写下你的建议、问题或想法..." />
          <input value={formEmail} onChange={e => setFormEmail(e.target.value)} type="email"
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]"
            placeholder="邮箱，方便我们回复你（选填）" />
        </>
      )
    })()

    return (
      <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 space-y-2.5 mb-4">
        {formContent}
        {/* 验证码 */}
        <div className="pt-1">{renderCaptcha()}</div>
        {dailyRemaining !== null && dailyRemaining <= 3 && (
          <p className="text-xs text-orange-500">今日还可提交 {dailyRemaining} 次</p>
        )}
        {formError && <p className="text-xs text-red-500">{formError}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={formLoading || submitted}
            className="px-4 py-2 rounded-lg bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {submitted ? '✓ 已提交' : formLoading ? '提交中...' : '提交'}
          </button>
          <button type="button" onClick={resetForm}
            className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm">取消</button>
        </div>
      </form>
    )
  }

  // ========== 列表 ==========
  function renderList() {
    if (loading) return <p className="text-center py-8 text-[var(--text-muted)] text-sm">加载中...</p>
    if (activeTab === 'share') return null

    const filtered = items.filter(item => item.type === activeTab)
    if (filtered.length === 0) {
      const emptyTexts: Record<TabType, string> = {
        request: '还没有人许愿，来第一个吧',
        share: '',
        feedback: '还没有人发言，欢迎畅所欲言',
      }
      return <p className="text-center py-12 text-[var(--text-muted)] text-sm">{emptyTexts[activeTab]}</p>
    }

    return (
      <div className="space-y-2">
        {filtered.map(item => {
          const isLiked = likedMap[item.id]
          return (
            <div key={item.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3">
              <p className="text-sm text-[var(--text-primary)] break-all leading-relaxed">{item.name}</p>
              {item.description && <p className="text-xs text-[var(--text-secondary)] mt-1 break-all">{item.description}</p>}
              <div className="flex items-center gap-3 mt-2">
                {activeTab === 'request' && (
                  <button id={`like-btn-${item.id}`} onClick={() => handleLike(item.id, item.name)}
                    className="flex items-center gap-1 text-xs transition-colors">
                    {isLiked ? <span className="text-red-500 scale-110">❤️</span> : <span className="text-[var(--text-muted)]">❤</span>}
                    <span className={isLiked ? 'text-red-500' : 'text-[var(--text-muted)]'}>{item.likes > 0 ? item.likes : ''}</span>
                  </button>
                )}
                <span className="text-xs text-[var(--text-muted)]">{timeAgo(item.createdAt)}</span>
                {item.isProcessed && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-600 font-medium">已处理</span>}
              </div>
              {item.reply && (
                <div className="mt-2 bg-[var(--bg-secondary)] rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--brand)]">站主回复：</span>{item.reply}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-[var(--text-primary)] text-center mb-0.5">追剧许愿池</h1>
      <p className="text-xs text-[var(--text-muted)] text-center mb-5">求资源、提建议，让我们一起让这里变得更好哦</p>

      <div className="flex gap-1 bg-[var(--bg-secondary)] rounded-xl p-1 mb-4">
        {tabs.map(tab => (
          <button key={tab.key}
            onClick={() => { setActiveTab(tab.key); setShowForm(false); setSubmitted(false) }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {submitted && (
        <div className="bg-[var(--bg-card)] border border-green-200 rounded-xl p-4 mb-4 text-center">
          <div className="text-3xl mb-1">✓</div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{submitMsg}</p>
          {dailyRemaining !== null && (
            <p className="text-xs text-[var(--text-muted)] mt-1">今日还可提交 {dailyRemaining} 次</p>
          )}
        </div>
      )}

      {!showForm && (
        <button onClick={handleOpenForm}
          className="w-full py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--brand)] hover:border-[var(--brand)] transition-all mb-4">
          + {activeTab === 'request' ? '许下一个心愿' : activeTab === 'share' ? '分享我有的资源' : '写下你的建议'}
        </button>
      )}

      {renderForm()}
      {renderList()}
    </div>
  )
}
