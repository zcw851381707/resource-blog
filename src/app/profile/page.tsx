'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { isUpcomingActive, calcCurrentEpisode } from '@/lib/drama-schedule-utils'

type TabKey = 'info' | 'following' | 'planned' | 'favorites' | 'subscriptions' | 'comments'

interface DramaLite {
  id: string
  title: string
  originalTitle?: string | null
  slug: string
  coverImage?: string | null
  imagePosition?: string | null
  isCompleted?: boolean
  isOnSchedule?: boolean
  isUpcoming?: boolean
  totalEpisodes?: number | null
  currentEpisode?: number | null
  manualEpisode?: number | null
  premiereEpisodes?: number | null
  startDate?: string | null
  airDays?: string | null
  airTime?: string | null
  episodesPerDay?: number | null
}

const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function getAdminEp(d: DramaLite): number {
  return calcCurrentEpisode({
    currentEpisode: d.currentEpisode,
    manualEpisode: d.manualEpisode,
    startDate: d.startDate,
    premiereEpisodes: d.premiereEpisodes,
    episodesPerDay: d.episodesPerDay,
    airDays: d.airDays,
    airTime: d.airTime,
  })
}

export default function ProfilePage() {
  const { user, logout, isAdmin } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>('info')
  const [counts, setCounts] = useState({ watching: 0, planned: 0, completed: 0, favorites: 0, subscriptions: 0, comments: 0 })

  // 资料 tab 内部状态
  const [username, setUsername] = useState(user?.username || '')
  const [savingName, setSavingName] = useState(false)
  const [msg, setMsg] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)

  // 修改密码弹窗
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [newPass2, setNewPass2] = useState('')
  const [savingPass, setSavingPass] = useState(false)

  // 加载统计数据
  const loadCounts = useCallback(async () => {
    try {
      const [favRes, follRes, subsRes, commentRes] = await Promise.all([
        fetch('/api/favorites'),
        fetch('/api/following'),
        fetch('/api/subscriptions'),
        fetch('/api/comments?myComments=true&page=1&limit=1').then(r => r.json()).catch(() => ({ total: 0 })),
      ])
      const favData = await favRes.json()
      const follData = await follRes.json()
      const subsData = subsRes.ok ? await subsRes.json() : { items: [] }
      const items = follData.items || []
      setCounts({
        watching: items.filter((i: { status: string }) => i.status === 'watching').length,
        planned: items.filter((i: { status: string }) => i.status === 'planned').length,
        completed: items.filter((i: { status: string }) => i.status === 'completed').length,
        favorites: (favData.items || []).length,
        subscriptions: (subsData.items || []).length,
        comments: commentRes.total || 0,
      })
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    loadCounts()
  }, [loadCounts])

  if (!user) return null

  // ============ 修改确认弹窗 ============
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmType, setConfirmType] = useState<'username' | 'avatar'>('username')
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(null)

  const daysUntilNext = (() => {
    if (!user.profileChangedAt) return 0
    const next = new Date(user.profileChangedAt)
    next.setDate(next.getDate() + 180)
    return Math.max(0, Math.ceil((next.getTime() - Date.now()) / 86400000))
  })()

  const isInCooldown = daysUntilNext > 0

  const saveName = async () => {
    if (!username.trim() || username === user.username) return
    if (isInCooldown) { setMsg(`修改后需等 180 天，距离下次可修改还有 ${daysUntilNext} 天`); return }
    setConfirmType('username')
    setConfirmOpen(true)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setMsg('头像不能超过 2MB'); return }
    if (isInCooldown) { setMsg(`修改后需等 180 天，距离下次可修改还有 ${daysUntilNext} 天`); e.target.value = ''; return }
    setPendingAvatarFile(file)
    const objectUrl = URL.createObjectURL(file)
    setPendingAvatarUrl(objectUrl)
    setConfirmType('avatar')
    setConfirmOpen(true)
    e.target.value = ''
  }

  const confirmSubmit = async () => {
    setConfirmOpen(false)
    if (confirmType === 'username') {
      setSavingName(true)
      const res = await fetch('/api/auth/me', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        window.location.reload()
      } else {
        setMsg(data.error || '更新失败')
        setSavingName(false)
      }
    } else if (confirmType === 'avatar' && pendingAvatarFile) {
      setAvatarUploading(true)
      const fd = new FormData(); fd.append('file', pendingAvatarFile)
      try {
        const res = await fetch('/api/upload/avatar', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.url) {
          const r2 = await fetch('/api/auth/me', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatar: data.url }),
          })
          const d2 = await r2.json()
          if (d2.ok) window.location.reload()
          else { setMsg(d2.error || '更新失败'); setAvatarUploading(false) }
        } else { setMsg(data.error || '上传失败'); setAvatarUploading(false) }
      } catch { setMsg('上传失败'); setAvatarUploading(false) }
      if (pendingAvatarUrl) URL.revokeObjectURL(pendingAvatarUrl)
      setPendingAvatarFile(null)
      setPendingAvatarUrl(null)
    }
  }

  const changePass = async () => {
    if (!oldPass) { setMsg('请输入旧密码'); return }
    if (!newPass || newPass.length < 6) { setMsg('新密码至少 6 位'); return }
    if (newPass !== newPass2) { setMsg('两次密码不一致'); return }
    setSavingPass(true)
    const res = await fetch('/api/auth/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }),
    })
    const data = await res.json()
    if (data.ok) { setMsg('密码已修改'); setShowPwdModal(false); setOldPass(''); setNewPass(''); setNewPass2('') }
    else { setMsg(data.error || '修改失败') }
    setSavingPass(false)
  }

  const inputClass = "w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]"

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row gap-5">
        {/* ===== 侧边栏 ===== */}
        <div className="w-full md:w-[200px] shrink-0">
          {/* 概览卡（移动端顶部 / 桌面端顶部） */}
          <div className="bg-gradient-to-r md:bg-gradient-to-br from-[var(--brand-bg)] to-[var(--brand-grad-to)] rounded-2xl p-4 mb-3 flex items-center gap-3 md:flex-col md:items-start md:gap-3">
            <div className="relative shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)] text-xl md:text-2xl font-bold shrink-0">{user.username.slice(0, 1)}</div>
              )}
              {isAdmin && (
                <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#FFD700] flex items-center justify-center shadow-sm border-2 border-[var(--bg-card)]"
                  title="管理员">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#B8860B">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 md:w-full">
              <div className="text-base md:text-lg font-bold text-[var(--text-primary)] truncate">{user.username}</div>
              {user.createdAt && (
                <div className="text-[10px] text-[var(--brand)] mt-0.5 font-medium">
                  🌅 今天是我们见面的第 {daysSince(new Date(user.createdAt))} 天
                </div>
              )}
            </div>
          </div>

          {/* Tab 列表 */}
          <div className="bg-[var(--bg-card)] rounded-2xl p-2 md:p-2 md:sticky md:top-20">
            <TabItem
              active={tab === 'info'}
              onClick={() => { setTab('info'); setMsg('') }}
              icon="user"
              label="我的资料"
            />
            <TabItem
              active={tab === 'following'}
              onClick={() => setTab('following')}
              icon="tv"
              label="我的追剧"
            />
            <TabItem
              active={tab === 'planned'}
              onClick={() => setTab('planned')}
              icon="bookmark"
              label="想看"
            />
            <TabItem
              active={tab === 'favorites'}
              onClick={() => setTab('favorites')}
              icon="heart"
              label="我的收藏"
            />
            <TabItem
              active={tab === 'subscriptions'}
              onClick={() => setTab('subscriptions')}
              icon="bell"
              label="我的预约"
            />
            <TabItem
              active={tab === 'comments'}
              onClick={() => setTab('comments')}
              icon="comment"
              label="我的评论"
            />
            <div className="h-px bg-[var(--border)] my-2" />
            <button onClick={() => setShowPwdModal(true)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
              <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              修改密码
            </button>
            <button onClick={() => logout()} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors">
              <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              退出登录
            </button>
          </div>
        </div>

        {/* ===== 右侧主区域 ===== */}
        <div className="flex-1 bg-[var(--bg-card)] rounded-2xl p-4 md:p-6 min-w-0">
          {msg && (
            <div className={`text-xs rounded-lg px-4 py-3 mb-6 ${msg.includes('失败') ? 'bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger)]' : 'bg-[var(--success-bg)] border border-[var(--success-border)] text-[var(--success)]'}`}>{msg}</div>
          )}

          {/* 我的资料 */}
          {tab === 'info' && (
            <div>
              <SectionTitle icon="user">账号信息</SectionTitle>
              <div className="divide-y divide-[var(--border)]">
                <div className="flex items-center py-4">
                  <span className="w-[100px] shrink-0 text-sm text-[var(--text-muted)]">用户名</span>
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <input className="border border-transparent bg-transparent px-2.5 py-1.5 rounded-md text-sm text-[var(--text-primary)] w-full max-w-[240px] focus:outline-none focus:border-[var(--brand)] focus:bg-[var(--bg-secondary)]" value={username} onChange={e => setUsername(e.target.value)} maxLength={16} disabled={isInCooldown} />
                    <button onClick={saveName} disabled={savingName || isInCooldown} className="px-4 py-1.5 rounded-full border border-[var(--brand)] bg-[var(--bg-card)] text-[var(--brand)] text-xs hover:bg-[var(--brand-pale)] transition-colors disabled:opacity-50">{savingName ? '保存中' : '保存'}</button>
                    {isInCooldown && <span className="text-[11px] text-[var(--warning)]">距离下次可修改还有 {daysUntilNext} 天</span>}
                  </div>
                </div>
                <div className="flex items-center py-4">
                  <span className="w-[100px] shrink-0 text-sm text-[var(--text-muted)]">头像</span>
                  <div className="flex items-center gap-3 flex-wrap">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)] text-lg font-bold">{user.username.slice(0, 1)}</div>
                    )}
                    <label className={`px-4 py-1.5 rounded-full border border-[var(--brand)] bg-[var(--bg-card)] text-[var(--brand)] text-xs transition-colors ${isInCooldown ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--brand-pale)]'}`}>
                      {avatarUploading ? '上传中...' : '更换头像'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isInCooldown} />
                    </label>
                    {isInCooldown && <span className="text-[11px] text-[var(--warning)]">距离下次可修改还有 {daysUntilNext} 天</span>}
                  </div>
                </div>
                <div className="flex items-center py-4">
                  <span className="w-[100px] shrink-0 text-sm text-[var(--text-muted)]">邮箱</span>
                  <span className="text-sm text-[var(--text-muted)]">{user.email}（不可修改）</span>
                </div>
              </div>

              {/* 概览统计 */}
              <h3 className="text-lg font-bold text-[var(--text-primary)] mt-8 mb-3">我的数据</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="追剧" value={counts.watching} icon="tv" />
                <StatCard label="想看" value={counts.planned} icon="bookmark" />
                <StatCard label="收藏" value={counts.favorites} icon="heart" />
                <StatCard label="预约" value={counts.subscriptions} icon="bell" />
                <StatCard label="评论" value={counts.comments} icon="comment" />
              </div>
            </div>
          )}

          {/* 我的追剧 — 嵌入式简版 */}
          {tab === 'following' && (
            <div>
              <SectionTitle icon="tv">我的追剧</SectionTitle>
              <ProfileFollowingList onChange={loadCounts} defaultSubTab="watching" />
            </div>
          )}

          {/* 想看 — 嵌入式简版（追剧中的 planned 分类） */}
          {tab === 'planned' && (
            <div>
              <SectionTitle icon="bookmark">想看</SectionTitle>
              <ProfileFollowingList onChange={loadCounts} defaultSubTab="planned" />
            </div>
          )}

          {/* 我的收藏 — 嵌入式简版 */}
          {tab === 'favorites' && (
            <div>
              <SectionTitle icon="heart">我的收藏</SectionTitle>
              <ProfileFavoritesList onChange={loadCounts} />
            </div>
          )}

          {/* 我的预约 — 嵌入式简版 */}
          {tab === 'subscriptions' && (
            <div>
              <SectionTitle icon="bell">我的预约</SectionTitle>
              <ProfileSubscriptionsList onChange={loadCounts} />
            </div>
          )}

          {/* 我的评论 — 嵌入式简版 */}
          {tab === 'comments' && (
            <div>
              <SectionTitle icon="comment">我的评论</SectionTitle>
              <ProfileCommentsList onChange={loadCounts} />
            </div>
          )}
        </div>
      </div>

      {/* 修改密码弹窗 */}
      {showPwdModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowPwdModal(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">修改密码</h3>
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">旧密码</label>
                <input type="password" className={inputClass} value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder="请输入旧密码" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">新密码</label>
                <input type="password" className={inputClass} value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="至少 6 位" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">确认新密码</label>
                <input type="password" className={inputClass} value={newPass2} onChange={e => setNewPass2(e.target.value)} placeholder="请再次输入新密码" />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowPwdModal(false)} className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--border)] transition-colors">取消</button>
              <button onClick={changePass} disabled={savingPass} className="px-4 py-2 rounded-lg bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">{savingPass ? '修改中' : '确定修改'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 修改用户名/头像确认弹窗 */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfirmOpen(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">确认修改{confirmType === 'username' ? '用户名' : '头像'}？</h3>
            <div className="bg-[var(--warning-bg)] border border-[var(--warning)]/30 rounded-lg p-3 mb-5 text-sm text-[var(--text-secondary)] leading-relaxed">
              {confirmType === 'avatar' && pendingAvatarUrl && (
                <div className="flex justify-center mb-3">
                  <img src={pendingAvatarUrl} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-[var(--brand)]" />
                </div>
              )}
              {confirmType === 'username' && (
                <p className="mb-2">新用户名：<span className="font-semibold text-[var(--text-primary)]">{username}</span></p>
              )}
              <p>提交后 <span className="font-semibold text-[var(--warning)]">180 天</span> 内不能再次修改，请确认后再提交。</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setConfirmOpen(false); if (pendingAvatarUrl) { URL.revokeObjectURL(pendingAvatarUrl); setPendingAvatarFile(null); setPendingAvatarUrl(null) } }} className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--border)] transition-colors">再想想</button>
              <button onClick={confirmSubmit} disabled={savingName || avatarUploading} className="px-4 py-2 rounded-lg bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">确认修改</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabItem({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: 'user' | 'tv' | 'heart' | 'clock' | 'bookmark' | 'bell' | 'comment'; label: string; count?: number }) {
  const icons = {
    user: <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>,
    tv: <path d="M5 4h14l-1 7H6L5 4zM3 4H1m4 0v14a1 1 0 001 1h12a1 1 0 001-1V4M9 11h6"/>,
    heart: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>,
    clock: <path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>,
    bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    comment: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>,
  }
  const heartFilled = icon === 'heart'
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm cursor-pointer mb-1 transition-colors ${
        active ? 'bg-[var(--brand-pale)] text-[var(--brand)] font-semibold' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
      }`}
    >
      <svg className="w-[18px] h-[18px] shrink-0" fill={heartFilled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        {icons[icon]}
        {icon === 'user' && <circle cx="12" cy="7" r="4"/>}
      </svg>
      <span className="flex-1">{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--brand)] text-white font-semibold">{count}</span>
      )}
    </div>
  )
}

// 主区标题组件：与左侧 Tab 图标一一对应
function SectionTitle({ icon, children }: { icon: 'user' | 'tv' | 'heart' | 'bookmark' | 'bell' | 'comment'; children: React.ReactNode }) {
  const icons = {
    user: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    tv: <path d="M5 4h14l-1 7H6L5 4zM3 4H1m4 0v14a1 1 0 001 1h12a1 1 0 001-1V4M9 11h6"/>,
    heart: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>,
    bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    comment: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>,
  }
  const filled = icon === 'heart'
  return (
    <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
      <span className="w-8 h-8 rounded-lg bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)]">
        <svg className="w-4 h-4" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          {icons[icon]}
        </svg>
      </span>
      {children}
    </h2>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: 'tv' | 'clock' | 'heart' | 'bell' | 'bookmark' | 'comment' }) {
  const icons = {
    tv: <path d="M5 4h14l-1 7H6L5 4zM3 4H1m4 0v14a1 1 0 001 1h12a1 1 0 001-1V4M9 11h6"/>,
    clock: <path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>,
    heart: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>,
    comment: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>,
  }
  const heartFilled = icon === 'heart'
  return (
    <div className="bg-gradient-to-br from-[var(--brand-bg)] to-[var(--brand-grad-to)] border border-[var(--brand-pale)] rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-[var(--brand-pale)] text-[var(--brand)] flex items-center justify-center shrink-0">
        <svg className="w-5 h-5" fill={heartFilled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          {icons[icon]}
        </svg>
      </div>
      <div>
        <div className="text-xl font-bold text-[var(--brand)] leading-none">{value}</div>
        <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
      </div>
    </div>
  )
}

function daysSince(date: Date): number {
  const now = Date.now()
  const diff = now - date.getTime()
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr)
  const now = Date.now()
  const diffMs = now - d.getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 天前`
  const month = Math.floor(day / 30)
  if (month < 12) return `${month} 个月前`
  return `${Math.floor(day / 365)} 年前`
}

// ============ 嵌入式：我的预约简版 ============
function ProfileSubscriptionsList({ onChange }: { onChange: () => void }) {
  const [items, setItems] = useState<Array<{ id: string; dramaId: string; createdAt: string }>>([])
  const [dramas, setDramas] = useState<Record<string, DramaLite & { expectedDate?: string | null; expectedPrecision?: string | null }>>({})
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/subscriptions')
      const data = await res.json()
      setItems(data.items || [])
      setDramas(data.dramas || {})
      setCounts(data.counts || {})
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const remove = async (dramaId: string) => {
    await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dramaId }),
    })
    setItems(prev => prev.filter(i => i.dramaId !== dramaId))
    onChange()
  }

  if (loading) return <div className="py-8 text-center text-sm text-[var(--text-muted)]">加载中...</div>

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[var(--warning-bg)] flex items-center justify-center text-[var(--warning)]">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-1">还没有预约任何剧</p>
        <p className="text-xs text-[var(--text-muted)] mb-4">在「即将上线」的剧集详情页点"预约上线"，开播时记得通知你</p>
        <Link href="/schedule" className="text-sm text-[var(--brand)] hover:underline">去排期页看看 →</Link>
      </div>
    )
  }

  function getUpcomingText(dateStr?: string | null, precision?: string | null) {
    if (!dateStr) return '即将上线'
    const d = new Date(dateStr)
    if (precision === 'year') return `${d.getFullYear()}年开播`
    if (precision === 'month') return `${d.getMonth() + 1}月开播`
    return `${d.getMonth() + 1}月${d.getDate()}日开播`
  }

  return (
    <div className="space-y-2">
      {items.map(item => {
        const d = dramas[item.dramaId]
        if (!d) return null
        const c = counts[item.dramaId] || 0
        return (
          <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors group">
            <Link href={`/drama/${d.slug}`} className="shrink-0">
              <div className="relative w-12 h-16 rounded-md overflow-hidden bg-gradient-to-br from-orange-200 to-orange-400">
                {d.coverImage && <img src={d.coverImage} alt={d.title} className="w-full h-full object-cover" style={{ objectPosition: d.imagePosition || 'center' }} />}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/drama/${d.slug}`} className="block text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors">
                {d.title || d.originalTitle}
              </Link>
              <p className="text-[11px] text-[var(--warning)] mt-0.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>{getUpcomingText(d.expectedDate, d.expectedPrecision)}</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="text-[var(--text-muted)]">{c} 人预约</span>
              </p>
            </div>
            <button
              onClick={() => remove(d.id)}
              className="shrink-0 px-2.5 py-1 rounded-md text-[11px] text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] transition-colors"
            >
              取消预约
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ============ 嵌入式：我的追剧简版 ============
function ProfileFollowingList({ onChange, defaultSubTab = 'watching' }: { onChange: () => void; defaultSubTab?: 'watching' | 'planned' | 'completed' }) {
  const [items, setItems] = useState<Array<{ id: string; dramaId: string; status: string; progress: number }>>([])
  const [dramas, setDramas] = useState<Record<string, DramaLite>>({})
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState<'watching' | 'planned' | 'completed'>(defaultSubTab)

  const load = useCallback(async () => {
    const res = await fetch('/api/following')
    const data = await res.json()
    setItems(data.items || [])
    setDramas(data.dramas || {})
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="py-8 text-center text-sm text-[var(--text-muted)]">加载中...</div>

  const counts = {
    watching: items.filter(i => i.status === 'watching').length,
    planned: items.filter(i => i.status === 'planned').length,
    completed: items.filter(i => i.status === 'completed').length,
  }
  const list = items.filter(i => i.status === subTab)

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)]">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M5 4h14l-1 7H6L5 4zM3 4H1m4 0v14a1 1 0 001 1h12a1 1 0 001-1V4M9 11h6"/></svg>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-1">还没有追任何剧</p>
        <p className="text-xs text-[var(--text-muted)] mb-4">在剧集详情页点"追剧"开始</p>
        <Link href="/all" className="text-sm text-[var(--brand)] hover:underline">去看看 →</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {([
          { key: 'watching', label: '追剧中' },
          { key: 'planned', label: '想看' },
          { key: 'completed', label: '已看完' },
        ] as { key: typeof subTab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              subTab === t.key
                ? 'bg-[var(--brand)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--brand-pale)] hover:text-[var(--brand)]'
            }`}
          >
            {t.label} {counts[t.key]}
          </button>
        ))}
        <Link href="/following" className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--brand)] self-center whitespace-nowrap">查看全部 →</Link>
      </div>
      {list.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">该分类下还没有剧</p>
      ) : (
        <div className="space-y-2">
          {list.slice(0, 5).map(item => {
            const d = dramas[item.dramaId]
            if (!d) return null
            const adminEp = getAdminEp(d)
            const userEp = item.progress || 0
            const hasNew = subTab === 'watching' && !d.isCompleted && adminEp > userEp
            return (
              <Link key={item.id} href={`/drama/${d.slug}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors group">
                <div className="relative w-12 h-16 rounded-md overflow-hidden bg-gradient-to-br from-[#F4B8BA] to-[#E8A0A4] shrink-0">
                  {d.coverImage && <img src={d.coverImage} alt={d.title} className="w-full h-full object-cover" style={{ objectPosition: d.imagePosition || 'center' }} />}
                  {hasNew && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--danger)] border-2 border-[var(--bg-card)] animate-pulse" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors">{d.title || d.originalTitle}</span>
                    {hasNew && <span className="text-[10px] text-[var(--danger)] font-medium">新</span>}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {subTab === 'watching' && `EP ${userEp || 1}${d.totalEpisodes ? ` / ${d.totalEpisodes}` : ''}`}
                    {subTab === 'planned' && (isUpcomingActive(d) ? '即将上线' : '想看')}
                    {subTab === 'completed' && '✓ 已看完'}
                  </p>
                </div>
                <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============ 嵌入式：我的收藏简版 ============
function ProfileFavoritesList({ onChange }: { onChange: () => void }) {
  const [items, setItems] = useState<Array<{ id: string; dramaId: string; createdAt: string }>>([])
  const [dramas, setDramas] = useState<Record<string, DramaLite>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch('/api/favorites')
    const data = await res.json()
    setItems(data.items || [])
    setDramas(data.dramas || {})
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const remove = async (dramaId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dramaId }),
    })
    setItems(prev => prev.filter(i => i.dramaId !== dramaId))
    onChange()
  }

  if (loading) return <div className="py-8 text-center text-sm text-[var(--text-muted)]">加载中...</div>

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)]">
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-1">还没有收藏</p>
        <p className="text-xs text-[var(--text-muted)] mb-4">在剧集详情页点 ❤️ 收藏</p>
        <Link href="/all" className="text-sm text-[var(--brand)] hover:underline">去看看 →</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Link href="/favorites" className="text-xs text-[var(--text-muted)] hover:text-[var(--brand)]">查看全部 →</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.slice(0, 8).map(item => {
          const d = dramas[item.dramaId]
          if (!d) return null
          return (
            <Link key={item.id} href={`/drama/${d.slug}`} className="group block">
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gradient-to-br from-[#F4B8BA] to-[#E8A0A4]">
                {d.coverImage && <img src={d.coverImage} alt={d.title} className="w-full h-full object-cover" style={{ objectPosition: d.imagePosition || 'center' }} />}
                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[var(--bg-card)]/95 flex items-center justify-center text-[var(--brand)]">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                </span>
                <button
                  onClick={(e) => remove(d.id, e)}
                  className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  取消
                </button>
              </div>
              <p className="text-xs font-medium text-[var(--text-primary)] mt-1.5 truncate group-hover:text-[var(--brand)] transition-colors">{d.title || d.originalTitle}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">收藏于 {timeAgo(item.createdAt)}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ============ 嵌入式：我的评论简版 ============
function ProfileCommentsList({ onChange }: { onChange: () => void }) {
  const [items, setItems] = useState<Array<{
    id: string; content: string; createdAt: string;
    dramaTitle: string; dramaSlug: string;
  }>>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/comments?myComments=true&page=1&limit=10')
      const data = await res.json()
      setItems(data.items || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="py-8 text-center text-sm text-[var(--text-muted)]">加载中...</div>

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)]">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-1">还没有发表过评论</p>
        <p className="text-xs text-[var(--text-muted)] mb-4">在剧集详情页写下你对剧的感受吧</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map(c => (
        <div key={c.id} className="flex gap-2.5 p-3 rounded-lg bg-[var(--bg-secondary)]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link href={`/drama/${c.dramaSlug}`} className="text-xs text-[var(--brand)] hover:underline truncate">
                📺 {c.dramaTitle}
              </Link>
              <span className="text-[9px] text-[var(--text-muted)] shrink-0">{timeAgo(c.createdAt)}</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap break-words">{c.content}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
