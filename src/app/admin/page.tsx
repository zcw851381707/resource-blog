'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) {
          setAuthenticated(true)
        }
        setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
      } else {
        router.replace('/admin/drama')
      }
    } catch {
      setError('登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-[var(--text-muted)]">加载中...</p>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-6">管理员登录</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                placeholder="请输入用户名"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                placeholder="请输入密码"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[var(--brand)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Dashboard
  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">管理面板</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { href: '/admin/drama', title: '影视管理', desc: '剧集、下载链接统一管理' },
          { href: '/admin/stats', title: '数据统计', desc: '浏览量、剧集热度排行' },
          { href: '/admin/banners', title: 'Banner 管理', desc: '首页轮播管理' },
          { href: '/admin/socials', title: '社交链接', desc: '管理社交平台链接' },
          { href: '/admin/announcements', title: '公告管理', desc: '站内公告配置' },
          { href: '/admin/requests', title: '求资源', desc: '查看用户求资源' },
          { href: '/admin/settings', title: '站点设置', desc: '打赏二维码等配置' },
        ].map(item => (
          <a
            key={item.href}
            href={item.href}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 hover:shadow-md hover:border-[var(--brand)] transition-all"
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{item.title}</h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">{item.desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
