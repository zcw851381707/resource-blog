'use client'

import { useState, useEffect } from 'react'

interface Settings {
  id?: string
  tipQRCode?: string | null
  tipButtonText: string
  publicAccountImg?: string | null
  larkWebhookUrl?: string | null
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>({ tipButtonText: '打赏' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingTip, setUploadingTip] = useState(false)
  const [uploadingPA, setUploadingPA] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      if (data) setSettings(data)
      setLoading(false)
    })
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    alert('保存成功')
  }

  const handleUpload = async (file: File, field: 'tipQRCode' | 'publicAccountImg') => {
    if (field === 'tipQRCode') setUploadingTip(true)
    else setUploadingPA(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        setSettings(prev => ({ ...prev, [field]: data.url }))
      }
    } catch { /* 静默处理 */ }

    if (field === 'tipQRCode') setUploadingTip(false)
    else setUploadingPA(false)
  }

  if (loading) return <p className="text-[var(--text-muted)]">加载中...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">站点设置</h1>

      <form onSubmit={handleSave} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">赞赏按钮文字</label>
          <input value={settings.tipButtonText} onChange={e => setSettings({ ...settings, tipButtonText: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
            placeholder="打赏" />
          <p className="text-xs text-[var(--text-muted)] mt-1">默认"打赏"，可自定义如"请我喝杯咖啡"</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">赞赏码图片</label>
          <div className="flex items-center gap-2">
            <input value={settings.tipQRCode || ''} onChange={e => setSettings({ ...settings, tipQRCode: e.target.value })}
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] text-sm"
              placeholder="图片 URL 或点击右侧上传" />
            <label className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${uploadingTip ? 'bg-gray-300 text-gray-500' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--brand-pale)] hover:text-[var(--brand)]'}`}>
              {uploadingTip ? '上传中...' : '上传'}
              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'tipQRCode') }} />
            </label>
          </div>
          {settings.tipQRCode && (
            <img src={settings.tipQRCode} alt="赞赏码预览" className="mt-2 w-32 h-32 object-contain rounded-lg border" />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">公众号推广图片</label>
          <div className="flex items-center gap-2">
            <input value={settings.publicAccountImg || ''} onChange={e => setSettings({ ...settings, publicAccountImg: e.target.value })}
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] text-sm"
              placeholder="图片 URL 或点击右侧上传" />
            <label className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${uploadingPA ? 'bg-gray-300 text-gray-500' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--brand-pale)] hover:text-[var(--brand)]'}`}>
              {uploadingPA ? '上传中...' : '上传'}
              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'publicAccountImg') }} />
            </label>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">显示在资源详情页右侧下载区下方</p>
          {settings.publicAccountImg && (
            <img src={settings.publicAccountImg} alt="公众号预览" className="mt-2 w-32 h-32 object-contain rounded-lg border" />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">飞书机器人 Webhook URL</label>
          <input value={settings.larkWebhookUrl || ''} onChange={e => setSettings({ ...settings, larkWebhookUrl: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
            placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx" />
          <p className="text-xs text-[var(--text-muted)] mt-1">用于追剧日历的自动开播提醒推送</p>
        </div>
        <button type="submit" disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
          {saving ? '保存中...' : '保存设置'}
        </button>
      </form>
    </div>
  )
}
