'use client'

import { useState, useEffect, useCallback } from 'react'

interface UserItem {
  id: string; username: string; email: string; avatar?: string | null
  role: string; status: string; lastLoginAt?: string | null; createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [confirm, setConfirm] = useState<{ id: string; action: string; label: string } | null>(null)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (statusFilter) params.set('status', statusFilter)
    if (roleFilter) params.set('role', roleFilter)
    const res = await fetch('/api/admin/users?' + params.toString())
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }, [q, statusFilter, roleFilter])

  useEffect(() => { load() }, [load])

  const doAction = async (id: string, action: string) => {
    if (action === 'delete') {
      const res = await fetch('/api/admin/users?id=' + id, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { alert(data.error); return }
    } else {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error); return }
    }
    setConfirm(null)
    load()
  }

  const actions = (u: UserItem) => {
    const btns: Array<{ action: string; label: string; className: string }> = []
    if (u.role !== 'admin') {
      btns.push(u.status === 'banned'
        ? { action: 'unban', label: '解封', className: 'text-green-500 hover:underline' }
        : { action: 'ban', label: '封禁', className: 'text-orange-500 hover:underline' })
      btns.push({ action: 'setAdmin', label: '设为管理员', className: 'text-[var(--brand)] hover:underline' })
      btns.push({ action: 'delete', label: '删除', className: 'text-red-500 hover:underline' })
    } else {
      btns.push({ action: 'removeAdmin', label: '取消管理员', className: 'text-orange-500 hover:underline' })
    }
    return btns
  }

  const inputClass = "h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)]"

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">用户管理</h1>
      <div className="flex flex-wrap gap-3 mb-4">
        <input className={inputClass + ' w-56'} placeholder="搜索用户名/邮箱" value={q} onChange={e => setQ(e.target.value)} />
        <select className={inputClass} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">全部状态</option><option value="active">正常</option><option value="banned">封禁</option>
        </select>
        <select className={inputClass} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">全部角色</option><option value="user">普通用户</option><option value="admin">管理员</option>
        </select>
      </div>
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">加载中...</p>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)]">
              <th className="text-left px-4 py-3 font-medium">用户</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">邮箱</th>
              <th className="text-left px-4 py-3 font-medium">角色</th>
              <th className="text-left px-4 py-3 font-medium">状态</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">注册时间</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">最后登录</th>
              <th className="text-left px-4 py-3 font-medium">操作</th>
            </tr>
            </thead>
            <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-[var(--border)] last:border-0 text-sm">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[var(--brand-pale)] flex items-center justify-center text-[var(--brand)] text-xs font-semibold shrink-0">
                      {u.username.slice(0, 1)}
                    </div>
                    <span className="text-[var(--text-primary)]">{u.username}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)] hidden md:table-cell">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${u.role === 'admin' ? 'bg-[var(--brand-pale)] text-[var(--brand)]' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}>
                    {u.role === 'admin' ? '管理员' : '用户'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${u.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {u.status === 'active' ? '正常' : '封禁'}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)] text-xs hidden md:table-cell">{new Date(u.createdAt).toLocaleDateString('zh-CN')}</td>
                <td className="px-4 py-3 text-[var(--text-muted)] text-xs hidden md:table-cell">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('zh-CN') : '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 text-xs">
                    {actions(u).map(a => (
                      <button key={a.action} onClick={() => setConfirm({ id: u.id, action: a.action, label: a.label })} className={a.className}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--text-muted)] text-sm">暂无用户</td></tr>
            )}
            </tbody>
          </table>
        </div>
      )}
      {confirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfirm(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">确认操作</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">确定要{confirm.label}该用户吗？</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirm(null)} className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--border)] transition-colors">取消</button>
              <button onClick={() => doAction(confirm.id, confirm.action)} className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 ${confirm.action === 'delete' ? 'bg-red-500' : 'bg-[var(--brand)]'}`}>确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
