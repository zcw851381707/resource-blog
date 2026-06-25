'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface UserInfo {
  id: string
  username: string
  email: string
  avatar?: string | null
  role: string
  createdAt?: string
  profileChangedAt?: string | null
  mutedUntil?: string | null
  mutedReason?: string | null
}

interface AuthContextType {
  user: UserInfo | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (data: {
    username: string; email: string; code: string; password: string
    inviteCode: string; avatar?: string; gender?: string; birthday?: string
  }) => Promise<{ ok: boolean; error?: string }>
  sendCode: (email: string, purpose: 'register' | 'reset') => Promise<{ ok: boolean; error?: string }>
  resetPassword: (email: string, code: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 用 window.fetch 绕过 Next.js 的 fetch 拦截，确保 Cookie 正常发送
    const fetcher = typeof window !== 'undefined' ? window.fetch : fetch
    fetcher('/api/auth/me?_=' + Math.random(), { credentials: 'include', cache: 'no-store' })
      .then(r => r.json())
      .then(data => { if (data.user) setUser(data.user) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const authLogin = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error || '登录失败' }
    if (data.user) setUser(data.user)
    return { ok: true }
  }, [])

  const authRegister = useCallback(async (d: {
    username: string; email: string; code: string; password: string
    inviteCode: string; avatar?: string
  }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error || '注册失败' }
    const me = await fetch('/api/auth/me').then(r => r.json())
    if (me.user) setUser(me.user)
    return { ok: true }
  }, [])

  const authSendCode = useCallback(async (email: string, purpose: 'register' | 'reset') => {
    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error || '发送失败' }
    return { ok: true }
  }, [])

  const authResetPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error || '重置失败' }
    return { ok: true }
  }, [])

  const authLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    // middleware 检测到无 cookie 后会自动 302，这里直接跳触发
    window.location.href = '/login'
  }, [])

  return (
    <AuthContext.Provider value={{
      user, loading,
      login: authLogin,
      register: authRegister,
      sendCode: authSendCode,
      resetPassword: authResetPassword,
      logout: authLogout,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
