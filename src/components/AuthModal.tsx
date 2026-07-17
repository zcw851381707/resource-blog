'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'

type Page = 'login' | 'register' | 'forgot'

interface Props {
  show: boolean
  initialPage?: Page
  onClose: () => void
}

export default function AuthModal({ show, initialPage = 'login', onClose }: Props) {
  const [page, setPage] = useState<Page>(initialPage)
  const { login, register, sendCode, resetPassword } = useAuth()

  // 注册
  const [regUser, setRegUser] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regCode, setRegCode] = useState('')
  const [regPass, setRegPass] = useState('')
  const [regPass2, setRegPass2] = useState('')
  const [regInvite, setRegInvite] = useState('')
  const [regGender, setRegGender] = useState('')
  const [regBirthday, setRegBirthday] = useState('')
  const [regAgree, setRegAgree] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)

  // 上传头像
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('头像不能超过 2MB'); return }
    setAvatarUploading(true)
    const fd = new FormData(); fd.append('file', file)
    try {
      const res = await fetch('/api/upload/avatar', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) setAvatarUrl(data.url)
      else setError('头像上传失败')
    } catch { setError('头像上传失败') }
    setAvatarUploading(false)
  }

  // 登录
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass] = useState('')

  // 忘记密码
  const [fpEmail, setFpEmail] = useState('')
  const [fpCode, setFpCode] = useState('')
  const [fpPass, setFpPass] = useState('')
  const [fpPass2, setFpPass2] = useState('')

  // 通用
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [codeCountdown, setCodeCountdown] = useState(0)
  const [showPwd, setShowPwd] = useState<Set<string>>(new Set())
  const togglePwd = (key: string) => setShowPwd(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n })
  const [capsOn, setCapsOn] = useState<Set<string>>(new Set())
  const setCaps = (key: string, on: boolean) => setCapsOn(prev => { const n = new Set(prev); if (on) n.add(key); else n.delete(key); return n })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 检测大写键：同时绑定 onKeyDown + onKeyUp，确保 CapsLock 切换后下一次按键即更新
  const detectCaps = (key: string) => (e: React.KeyboardEvent) => {
    if (typeof e.getModifierState === 'function') {
      setCaps(key, e.getModifierState('CapsLock'))
    }
  }
  // 离开时保留当前状态，不清除（下次聚焦回来仍能看到是否有大写）

  useEffect(() => { if (show) { setPage(initialPage); setError(''); setSuccess(''); setCapsOn(new Set()) } }, [show, initialPage])

  // 倒计时
  useEffect(() => {
    if (codeCountdown > 0) {
      timerRef.current = setInterval(() => setCodeCountdown(c => c - 1), 1000)
      return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }
  }, [codeCountdown])

  // 弹窗打开时锁住背景滚动，防止手机/iPad 上背景被拖动、上下露出空白
  useEffect(() => {
    if (!show) return
    const scrollY = window.scrollY
    const { style } = document.body
    const prev = { position: style.position, top: style.top, width: style.width, overflow: style.overflow }
    style.position = 'fixed'
    style.top = `-${scrollY}px`
    style.width = '100%'
    style.overflow = 'hidden'
    return () => {
      style.position = prev.position
      style.top = prev.top
      style.width = prev.width
      style.overflow = prev.overflow
      window.scrollTo(0, scrollY)
    }
  }, [show])

  if (!show) return null

  const handleSendCode = async (email: string, purpose: 'register' | 'reset') => {
    if (codeCountdown > 0) return
    if (!email) { setError('请输入邮箱'); return }
    setError('')
    setSubmitting(true)
    const r = await sendCode(email, purpose)
    setSubmitting(false)
    if (r.ok) {
      setSuccess('验证码已发送，15 分钟内有效')
      setCodeCountdown(60)
    } else {
      setError(r.error || '发送失败')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!regUser.trim()) { setError('请输入用户名'); return }
    if (regUser.length > 16) { setError('用户名不能超过 16 字'); return }
    if (!regEmail.trim()) { setError('请输入邮箱'); return }
    if (!regCode.trim()) { setError('请输入验证码'); return }
    if (!regPass || regPass.length < 6) { setError('密码至少 6 位'); return }
    if (!/[a-z]/.test(regPass) || !/[A-Z]/.test(regPass) || !/[0-9]/.test(regPass)) { setError('密码必须包含大小写字母和数字'); return }
    if (regPass !== regPass2) { setError('两次密码不一致'); return }
    if (!regInvite.trim()) { setError('请输入邀请码'); return }
    if (!regAgree) { setError('请先同意用户协议'); return }
    setSubmitting(true)
    const r = await register({
      username: regUser.trim(), email: regEmail.trim(), code: regCode.trim(),
      password: regPass, inviteCode: regInvite.trim(), avatar: avatarUrl || undefined,
      gender: regGender || undefined,
      birthday: regBirthday || undefined,
    })
    setSubmitting(false)
    if (r.ok) { onClose() } else { setError(r.error || '注册失败') }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!loginEmail.trim() || !loginPass) { setError('请输入邮箱和密码'); return }
    setSubmitting(true)
    const r = await login(loginEmail.trim(), loginPass)
    setSubmitting(false)
    if (r.ok) { onClose() } else { setError(r.error || '登录失败') }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!fpEmail.trim()) { setError('请输入邮箱'); return }
    if (!fpCode.trim()) { setError('请输入验证码'); return }
    if (!fpPass || fpPass.length < 6) { setError('新密码至少 6 位'); return }
    if (!/[a-z]/.test(fpPass) || !/[A-Z]/.test(fpPass) || !/[0-9]/.test(fpPass)) { setError('新密码必须包含大小写字母和数字'); return }
    if (fpPass !== fpPass2) { setError('两次密码不一致'); return }
    setSubmitting(true)
    const r = await resetPassword(fpEmail.trim(), fpCode.trim(), fpPass)
    setSubmitting(false)
    if (r.ok) { setSuccess('密码已重置'); setPage('login') } else { setError(r.error || '重置失败') }
  }

  const inputClass = "w-full h-11 px-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)] placeholder:text-[var(--text-muted)]"
  const btnClass = "w-full h-11 rounded-lg bg-[var(--brand)] text-white font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overscroll-none">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-[400px] max-h-[90dvh] overflow-y-auto overscroll-contain animate-modal-in">

        {/* 头部 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-wider">
            {page === 'login' ? '登 录' : page === 'register' ? '注 册' : '找回密码'}
          </h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-colors text-2xl leading-none">×</button>
        </div>

        <div className="px-6 pb-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-4 py-3 mb-4">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 text-xs rounded-lg px-4 py-3 mb-4">{success}</div>
          )}

          {/* ============ 登录 ============ */}
          {page === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">邮箱</label>
                <input type="text" className={inputClass} placeholder="请输入邮箱" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">密码</label>
                <div className="relative"><input type={showPwd.has("login") ? "text" : "password"} className={inputClass + ' pr-12'} placeholder="请输入密码" autoComplete="current-password" value={loginPass} onChange={e => setLoginPass(e.target.value)} onKeyDown={detectCaps("login")} onKeyUp={detectCaps("login")} /><button type="button" onClick={() => togglePwd("login")} aria-label={showPwd.has("login") ? '隐藏密码' : '显示密码'} className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-[var(--text-muted)] active:text-[var(--brand)] cursor-pointer z-10 touch-manipulation"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
                {capsOn.has("login") && <p className="mt-1 text-xs text-orange-500 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>大写锁定已打开</p>}
              </div>
              <button type="submit" disabled={submitting} className={btnClass}>{submitting ? '登录中...' : '登 录'}</button>
              <div className="flex justify-center gap-4 text-xs">
                <button type="button" onClick={() => { setPage('forgot'); setError(''); setSuccess('') }} className="text-[var(--brand)] hover:underline">忘记密码？</button>
                <span className="text-[var(--border)]">|</span>
                <button type="button" onClick={() => { setPage('register'); setError(''); setSuccess('') }} className="text-[var(--brand)] hover:underline">立即注册</button>
              </div>
            </form>
          )}

          {/* ============ 注册 ============ */}
          {page === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">* 用户名</label>
                <input className={inputClass} placeholder="16字内，汉字/数字/英文/符号" value={regUser} onChange={e => setRegUser(e.target.value)} maxLength={16} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">* 邀请码</label>
                <input className={inputClass} placeholder="内测用户请联系站长获取" value={regInvite} onChange={e => setRegInvite(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">* 邮箱</label>
                <div className="flex gap-2">
                  <input type="text" className={inputClass} placeholder="请输入邮箱" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                  <button type="button" disabled={codeCountdown > 0 || submitting}
                    onClick={() => handleSendCode(regEmail, 'register')}
                    className="shrink-0 h-11 px-4 rounded-lg border border-[var(--brand)] text-[var(--brand)] text-sm font-medium hover:bg-[var(--brand)] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                    {codeCountdown > 0 ? `${codeCountdown}s` : '发送验证码'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">* 验证码</label>
                <input className={inputClass} placeholder="15 分钟内有效" value={regCode} onChange={e => setRegCode(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">* 密码</label>
                <div className="relative"><input type={showPwd.has("reg") ? "text" : "password"} className={inputClass + ' pr-12'} placeholder="至少 6 位，区分大小写+数字" autoComplete="new-password" value={regPass} onChange={e => setRegPass(e.target.value)} onKeyDown={detectCaps("reg")} onKeyUp={detectCaps("reg")} /><button type="button" onClick={() => togglePwd("reg")} aria-label={showPwd.has("reg") ? '隐藏密码' : '显示密码'} className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-[var(--text-muted)] active:text-[var(--brand)] cursor-pointer z-10 touch-manipulation"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
                {capsOn.has("reg") && <p className="mt-1 text-xs text-orange-500 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>大写锁定已打开</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">* 确认密码</label>
                <div className="relative"><input type={showPwd.has("reg2") ? "text" : "password"} className={inputClass + ' pr-12'} placeholder="请再次输入密码" autoComplete="new-password" value={regPass2} onChange={e => setRegPass2(e.target.value)} onKeyDown={detectCaps("reg2")} onKeyUp={detectCaps("reg2")} /><button type="button" onClick={() => togglePwd("reg2")} aria-label={showPwd.has("reg2") ? '隐藏密码' : '显示密码'} className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-[var(--text-muted)] active:text-[var(--brand)] cursor-pointer z-10 touch-manipulation"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
                {capsOn.has("reg2") && <p className="mt-1 text-xs text-orange-500 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>大写锁定已打开</p>}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">性别（选填）</label>
                  <select className={inputClass} value={regGender} onChange={e => setRegGender(e.target.value)}>
                    <option value="">保密</option>
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">生日（选填）</label>
                  <input type="date" className={inputClass} value={regBirthday} onChange={e => setRegBirthday(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">头像（选填）</label>
                <div className="flex items-center gap-3">
                  <label className={`w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                    avatarUrl ? 'border-[var(--brand)]' : 'border-[var(--border)] hover:border-[var(--brand)]'
                  }`}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
                  </label>
                  <span className="text-xs text-[var(--text-muted)]">
                    {avatarUploading ? '上传中...' : avatarUrl ? '点击更换头像' : '点击上传头像'}
                  </span>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
                <input type="checkbox" checked={regAgree} onChange={e => setRegAgree(e.target.checked)} className="w-4 h-4 accent-[var(--brand)]" />
                我已阅读并同意《<a href="/agreement" target="_blank" className="text-[var(--brand)] hover:underline" onClick={e => e.stopPropagation()}>用户协议</a>》
              </label>
              <button type="submit" disabled={submitting} className={btnClass}>{submitting ? '注册中...' : '注 册'}</button>
              <p className="text-center text-xs text-[var(--text-muted)]">
                已有账号？<button type="button" onClick={() => { setPage('login'); setError(''); setSuccess('') }} className="text-[var(--brand)] hover:underline">立即登录</button>
              </p>
            </form>
          )}

          {/* ============ 忘记密码 ============ */}
          {page === 'forgot' && (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">邮箱</label>
                <div className="flex gap-2">
                  <input type="text" className={inputClass} placeholder="请输入邮箱" value={fpEmail} onChange={e => setFpEmail(e.target.value)} />
                  <button type="button" disabled={codeCountdown > 0 || submitting}
                    onClick={() => handleSendCode(fpEmail, 'reset')}
                    className="shrink-0 h-11 px-4 rounded-lg border border-[var(--brand)] text-[var(--brand)] text-sm font-medium hover:bg-[var(--brand)] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                    {codeCountdown > 0 ? `${codeCountdown}s` : '发送验证码'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">验证码</label>
                <input className={inputClass} placeholder="请输入邮箱验证码" value={fpCode} onChange={e => setFpCode(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">新密码</label>
                <div className="relative"><input type={showPwd.has("fp") ? "text" : "password"} className={inputClass + ' pr-12'} placeholder="至少 6 位，区分大小写+数字" autoComplete="new-password" value={fpPass} onChange={e => setFpPass(e.target.value)} onKeyDown={detectCaps("fp")} onKeyUp={detectCaps("fp")} /><button type="button" onClick={() => togglePwd("fp")} aria-label={showPwd.has("fp") ? '隐藏密码' : '显示密码'} className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-[var(--text-muted)] active:text-[var(--brand)] cursor-pointer z-10 touch-manipulation"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
                {capsOn.has("fp") && <p className="mt-1 text-xs text-orange-500 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>大写锁定已打开</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">确认新密码</label>
                <div className="relative"><input type={showPwd.has("fp2") ? "text" : "password"} className={inputClass + ' pr-12'} placeholder="请再次输入新密码" autoComplete="new-password" value={fpPass2} onChange={e => setFpPass2(e.target.value)} onKeyDown={detectCaps("fp2")} onKeyUp={detectCaps("fp2")} /><button type="button" onClick={() => togglePwd("fp2")} aria-label={showPwd.has("fp2") ? '隐藏密码' : '显示密码'} className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-[var(--text-muted)] active:text-[var(--brand)] cursor-pointer z-10 touch-manipulation"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
                {capsOn.has("fp2") && <p className="mt-1 text-xs text-orange-500 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>大写锁定已打开</p>}
              </div>
              <button type="submit" disabled={submitting} className={btnClass}>{submitting ? '提交中...' : '提 交'}</button>
              <p className="text-center text-xs">
                <button type="button" onClick={() => { setPage('login'); setError(''); setSuccess('') }} className="text-[var(--brand)] hover:underline">返回登录</button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
