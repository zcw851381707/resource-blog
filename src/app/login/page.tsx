'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const BUBBLES = [
  { size: 95, left: 18, duration: 18, delay: 0, anim: 'floatBubble' },
  { size: 110, left: 75, duration: 22, delay: -8, anim: 'floatBubbleAlt' },
  { size: 48, left: 30, duration: 14, delay: -2, anim: 'floatBubbleAlt' },
  { size: 55, left: 60, duration: 16, delay: -5, anim: 'floatBubble' },
  { size: 42, left: 85, duration: 15, delay: -10, anim: 'floatBubbleAlt' },
  { size: 50, left: 8, duration: 17, delay: -3, anim: 'floatBubble' },
  { size: 22, left: 12, duration: 12, delay: -1, anim: 'floatBubble' },
  { size: 28, left: 35, duration: 13, delay: -4, anim: 'floatBubbleAlt' },
  { size: 24, left: 50, duration: 14, delay: -7, anim: 'floatBubble' },
  { size: 30, left: 65, duration: 12, delay: -9, anim: 'floatBubbleAlt' },
  { size: 26, left: 80, duration: 15, delay: -6, anim: 'floatBubble' },
  { size: 20, left: 42, duration: 11, delay: -2, anim: 'floatBubbleAlt' },
  { size: 32, left: 92, duration: 14, delay: -11, anim: 'floatBubble' },
  { size: 24, left: 22, duration: 13, delay: -5, anim: 'floatBubbleAlt' },
]

function LoginForm() {
  const { user, login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  useEffect(() => {
    if (user) window.location.href = redirect
  }, [user, redirect])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) { setError('请输入邮箱和密码'); return }
    setSubmitting(true)
    const r = await login(email.trim(), password)
    setSubmitting(false)
    if (r.ok) {
      window.location.href = redirect
    } else {
      setError(r.error || '登录失败')
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col items-center justify-center px-4 gap-6 bg-gradient-to-b from-[#FFF5F5] to-[#FFEAEA]">
      {BUBBLES.map((b, i) => (
        <div key={i} className="pointer-events-none absolute" style={{ width: b.size, height: b.size, left: `${b.left}%`, borderRadius: '50%', animation: `${b.anim} ${b.duration}s linear ${b.delay}s infinite`, background: 'radial-gradient(circle at 28% 25%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.4) 18%, rgba(255,255,255,0.1) 38%, rgba(255,255,255,0.02) 65%, transparent 80%), radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 0%, transparent 70%)', boxShadow: 'inset 2px 3px 8px rgba(255,255,255,0.9), inset -2px -3px 6px rgba(232,160,164,0.18), inset 0 0 18px rgba(255,255,255,0.4), 0 6px 24px rgba(232,160,164,0.12), 0 0 0 1px rgba(255,255,255,0.5)', zIndex: 0 }} />
      ))}

      <div className="relative z-10 w-28 h-28 rounded-full overflow-hidden">
        <img src="/晨-方全红.png" alt="晨光曦" className="w-full h-full object-cover" />
      </div>
      <h1 className="relative z-10 text-2xl font-extrabold tracking-widest" style={{ color: '#1a1a1a' }}>晨光曦 · 分享站</h1>
      <p className="relative z-10 text-sm text-[var(--text-muted)] tracking-[8px]">影 视 · 分 享 · 资 源</p>

      <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-sm space-y-4 mt-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-4 py-3">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">邮箱</label>
          <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="请输入邮箱" className="w-full h-11 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:border-[var(--brand)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">密码</label>
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入密码" className="w-full h-11 px-3 pr-10 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:border-[var(--brand)]" />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg></button>
          </div>
        </div>
        <button type="submit" disabled={submitting} className="w-full h-11 rounded-full bg-[var(--brand)] text-white font-semibold text-sm tracking-[4px] hover:opacity-90 transition-opacity shadow-lg shadow-[var(--brand)]/25 disabled:opacity-50">{submitting ? '登录中...' : '登 录'}</button>
      </form>

      <p className="relative z-10 text-xs text-[var(--text-muted)] mt-4">输入账号密码即可访问</p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-white"><img src="/刷新页面中.png" alt="加载中" className="w-64 h-64 md:w-80 md:h-80 object-contain scale-[3]" /></div>}>
      <LoginForm />
    </Suspense>
  )
}
