'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface DailyStat { date: string; pv: number; uv: number }
interface DeviceStat { type: string; count: number; percentage: number }
interface DramaStat { id: string; title: string; slug: string; clickCount: number; region?: string | null; coverImage?: string | null; isCompleted?: boolean; isOnSchedule?: boolean; isUpcoming?: boolean }

interface StatsData {
  totalPv: number; totalUv: number
  periodPv: number; periodUv: number
  dailyStats: DailyStat[]
  deviceStats: DeviceStat[]
  topDramas: DramaStat[]
  dateRange: { start: string; end: string }
}

const deviceColors: Record<string, string> = { '手机': 'bg-blue-500', '电脑': 'bg-green-500', '平板': 'bg-purple-500', '爬虫': 'bg-gray-400' }
const presetRanges = [{ label: '今天', days: 0 }, { label: '本周', days: 7 }, { label: '本月', days: 30 }, { label: '全部', days: 9999 }]

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath()
}

function drawClipCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, w: number, h: number, r: number) {
  if (img) {
    ctx.save(); roundRect(ctx, x, y, w, h, r); ctx.clip()
    const ir = img.width / img.height; const tr = w / h
    let sx = 0, sy = 0, sw = img.width, sh = img.height
    if (ir > tr) { sw = img.height * tr; sx = (img.width - sw) / 2 }
    else { sh = img.width / tr; sy = (img.height - sh) / 2 }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h); ctx.restore()
  } else {
    ctx.fillStyle = '#f0f0f0'; roundRect(ctx, x, y, w, h, r); ctx.fill()
    ctx.font = '12px system-ui, -apple-system, sans-serif'; ctx.fillStyle = '#ccc'; ctx.textAlign = 'center'
    ctx.fillText('暂无封面', x + w / 2, y + h / 2 + 4)
  }
}

function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius)
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,126,107,0)')
  ctx.fillStyle = g; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
}

// ---------- 状态标签 ----------
const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
  isCompleted: { bg: '#E8E8E8', color: '#888', label: '已完结' },
  isOnSchedule: { bg: '#E3F2FD', color: '#1976D2', label: '追剧中' },
  isUpcoming: { bg: '#FFF3E0', color: '#F57C00', label: '即将上线' },
}

export default function AdminStats() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState('本月')
  const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const loadStats = useCallback(async (start: string, end: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams(); if (start) params.set('startDate', start); if (end) params.set('endDate', end)
      const res = await fetch(`/api/stats?${params.toString()}`); setStats(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    const now = new Date(); let start = '', end = now.toISOString().slice(0, 10)
    if (preset === '今天') { start = end
    } else if (preset === '本周') { const d = new Date(now); d.setDate(d.getDate() - 7); start = d.toISOString().slice(0, 10)
    } else if (preset === '本月') { const d = new Date(now); d.setDate(d.getDate() - 30); start = d.toISOString().slice(0, 10) }
    setStartDate(start); setEndDate(end); loadStats(start, end)
  }, [preset, loadStats])

  const handleCustomDate = () => { if (startDate && endDate) loadStats(startDate, endDate) }

  const generatePoster = useCallback(async () => {
    const canvas = canvasRef.current; if (!canvas || !stats) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const W = 1080, H = 1920; canvas.width = W; canvas.height = H
    const { topDramas, dateRange } = stats

    // 加载封面
    const imgs = await Promise.all(topDramas.map(d => new Promise<HTMLImageElement | null>(r => {
      if (!d.coverImage) { r(null); return }
      const img = new Image(); img.crossOrigin = 'anonymous'
      img.onload = () => r(img); img.onerror = () => r(null); img.src = d.coverImage
    })))

    // ==================== 背景 ====================
    ctx.fillStyle = '#FDF8F5'; ctx.fillRect(0, 0, W, H)

    // 顶部装饰渐变
    const topG = ctx.createLinearGradient(0, 0, 0, 500)
    topG.addColorStop(0, 'rgba(255,126,107,0.08)'); topG.addColorStop(1, 'rgba(255,126,107,0)')
    ctx.fillStyle = topG; ctx.fillRect(0, 0, W, 500)

    // ==================== 顶部 Logo + 标题 ====================
    // Logo
    ctx.font = 'bold 22px system-ui,-apple-system,sans-serif'; ctx.textAlign = 'left'
    ctx.fillStyle = '#FF7E6B'; ctx.fillText('✦ 晨光曦', 50, 58)
    ctx.font = '12px system-ui,-apple-system,sans-serif'; ctx.fillStyle = '#bbb'
    ctx.fillText('CHEN GUANG XI', 50, 78)

    // 大标题 "剧集热度 TOP10"
    const titleY = 160
    // "剧集热度"
    ctx.font = 'bold 34px system-ui,-apple-system,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#444'
    ctx.fillText('剧集热度', W / 2, titleY)
    // "TOP10" — 渐变立体字
    const top10Y = titleY + 72
    const top10G = ctx.createLinearGradient(W / 2 - 160, 0, W / 2 + 160, 0)
    top10G.addColorStop(0, '#FF7E6B'); top10G.addColorStop(0.5, '#FF9A8B'); top10G.addColorStop(1, '#FF7E6B')
    // 阴影层
    ctx.shadowColor = 'rgba(255,126,107,0.3)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 4
    ctx.font = 'bold 72px system-ui,-apple-system,sans-serif'; ctx.fillStyle = top10G; ctx.fillText('TOP 10', W / 2, top10Y)
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
    // 高光层
    ctx.font = 'bold 72px system-ui,-apple-system,sans-serif'; ctx.fillStyle = top10G; ctx.fillText('TOP 10', W / 2, top10Y)
    // 玻璃高光
    ctx.save(); ctx.rect(W / 2 - 200, top10Y - 58, 400, 30); ctx.clip()
    const hlG = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0)
    hlG.addColorStop(0, 'rgba(255,255,255,0)'); hlG.addColorStop(0.4, 'rgba(255,255,255,0.5)'); hlG.addColorStop(0.6, 'rgba(255,255,255,0.5)'); hlG.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = hlG; ctx.fillRect(W / 2 - 200, top10Y - 58, 400, 30)
    ctx.restore()

    // 装饰：光效粒子
    for (let i = 0; i < 18; i++) {
      const px = 60 + Math.random() * (W - 120), py = 40 + Math.random() * 180
      const r = 2 + Math.random() * 4
      ctx.fillStyle = `rgba(255,126,107,${0.1 + Math.random() * 0.2})`
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill()
    }

    // 皇冠 icon (简化)
    ctx.font = '28px system-ui,-apple-system,sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('👑', W / 2 + 300, 90)

    // 上升箭头
    ctx.fillStyle = 'rgba(255,126,107,0.3)'
    ctx.beginPath(); ctx.moveTo(W / 2 - 310, 100); ctx.lineTo(W / 2 - 295, 80); ctx.lineTo(W / 2 - 280, 100); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.moveTo(W / 2 - 310, 105); ctx.lineTo(W / 2 - 295, 85); ctx.lineTo(W / 2 - 280, 105); ctx.closePath()
    ctx.fillStyle = 'rgba(255,126,107,0.15)'; ctx.fill()

    // 时间胶囊
    const capW = 300, capH = 38, capX = (W - capW) / 2, capY = top10Y + 30
    const capG = ctx.createLinearGradient(capX, 0, capX + capW, 0)
    capG.addColorStop(0, 'rgba(255,126,107,0.9)'); capG.addColorStop(1, 'rgba(255,126,107,0.7)')
    ctx.fillStyle = capG; roundRect(ctx, capX, capY, capW, capH, 19); ctx.fill()
    ctx.font = '13px system-ui,-apple-system,sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'
    ctx.fillText(`📅 ${dateRange.start} ～ ${dateRange.end}`, W / 2, capY + 24)

    // ==================== TOP3 卡片 ====================
    const cardTop = 310
    const cardColors = [
      { border: 'rgba(255,215,0,0.3)', badge: '#FFD700', glow: 'rgba(255,215,0,0.15)' },
      { border: 'rgba(192,192,192,0.3)', badge: '#C0C0C0', glow: 'rgba(192,192,192,0.12)' },
      { border: 'rgba(205,127,50,0.3)', badge: '#CD7F32', glow: 'rgba(205,127,50,0.12)' },
    ]

    // #1 居中大卡
    const c1W = 280, c1H = 420, c1X = (W - c1W) / 2, c1Y = cardTop
    if (topDramas[0]) {
      const d = topDramas[0], img = imgs[0]
      // 背景光晕
      drawGlow(ctx, c1X + c1W / 2, c1Y + 100, 200, cardColors[0].glow)
      // 卡片背景
      ctx.shadowColor = 'rgba(0,0,0,0.06)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 8
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; roundRect(ctx, c1X, c1Y, c1W, c1H, 32); ctx.fill()
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
      // 金色描边
      ctx.strokeStyle = cardColors[0].border; ctx.lineWidth = 2
      roundRect(ctx, c1X, c1Y, c1W, c1H, 32); ctx.stroke()
      // 封面
      drawClipCover(ctx, img, c1X + 20, c1Y + 20, c1W - 40, 240, 16)
      // 徽章
      ctx.fillStyle = cardColors[0].badge
      roundRect(ctx, c1X + c1W - 80, c1Y - 14, 86, 36, 18); ctx.fill()
      ctx.font = 'bold 15px system-ui,-apple-system,sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'
      ctx.fillText('🥇 No.1', c1X + c1W - 37, c1Y + 11)
      // 剧名
      ctx.font = 'bold 18px system-ui,-apple-system,sans-serif'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'
      const t1 = d.title.length > 12 ? d.title.slice(0, 12) + '…' : d.title
      ctx.fillText(t1, c1X + c1W / 2, c1Y + c1H - 72)
      // 地区
      if (d.region) {
        ctx.fillStyle = 'rgba(255,126,107,0.1)'
        roundRect(ctx, c1X + c1W / 2 - 32, c1Y + c1H - 60, 64, 24, 12); ctx.fill()
        ctx.font = '12px system-ui,-apple-system,sans-serif'; ctx.fillStyle = '#FF7E6B'; ctx.fillText(d.region, c1X + c1W / 2, c1Y + c1H - 43)
      }
      // 热度值
      ctx.font = '13px system-ui,-apple-system,sans-serif'; ctx.fillStyle = '#999'; ctx.textAlign = 'center'
      ctx.fillText(`🔥 ${d.clickCount.toLocaleString()} 次浏览`, c1X + c1W / 2, c1Y + c1H - 18)
    }

    // #2 #3 左右
    const c23W = 230, c23H = 340, c23Gap = 35
    const c23Total = c23W * 2 + c23Gap, c23X = (W - c23Total) / 2, c23Y = cardTop + 60
    for (let i = 0; i < 2; i++) {
      const idx = i + 1; const d = topDramas[idx]; if (!d) continue
      const img = imgs[idx]; const cx = c23X + i * (c23W + c23Gap)
      // 光晕
      drawGlow(ctx, cx + c23W / 2, c23Y + 60, 140, cardColors[idx].glow)
      // 卡片
      ctx.shadowColor = 'rgba(0,0,0,0.05)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 6
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; roundRect(ctx, cx, c23Y, c23W, c23H, 24); ctx.fill()
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
      ctx.strokeStyle = cardColors[idx].border; ctx.lineWidth = 1.5
      roundRect(ctx, cx, c23Y, c23W, c23H, 24); ctx.stroke()
      // 封面
      drawClipCover(ctx, img, cx + 15, c23Y + 15, c23W - 30, 180, 12)
      // 徽章
      ctx.fillStyle = cardColors[idx].badge
      roundRect(ctx, cx + c23W - 66, c23Y - 12, 72, 32, 16); ctx.fill()
      ctx.font = 'bold 13px system-ui,-apple-system,sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'
      ctx.fillText(i === 0 ? '🥈 No.2' : '🥉 No.3', cx + c23W - 30, c23Y + 9)
      // 剧名
      ctx.font = '15px system-ui,-apple-system,sans-serif'; ctx.fillStyle = '#444'; ctx.textAlign = 'center'
      const tn = d.title.length > 10 ? d.title.slice(0, 10) + '…' : d.title
      ctx.fillText(tn, cx + c23W / 2, c23Y + c23H - 52)
      // 地区
      if (d.region) {
        ctx.fillStyle = 'rgba(255,126,107,0.08)'
        roundRect(ctx, cx + c23W / 2 - 26, c23Y + c23H - 42, 52, 22, 11); ctx.fill()
        ctx.font = '11px system-ui,-apple-system,sans-serif'; ctx.fillStyle = '#FF7E6B'; ctx.fillText(d.region, cx + c23W / 2, c23Y + c23H - 27)
      }
      // 热度
      ctx.font = '12px system-ui,-apple-system,sans-serif'; ctx.fillStyle = '#aaa'; ctx.fillText(`🔥 ${d.clickCount.toLocaleString()}`, cx + c23W / 2, c23Y + c23H - 8)
    }

    // ==================== TOP4-10 横向榜单 ====================
    const listTop = 790, rowH = 88
    // 分区标题
    ctx.font = 'bold 16px system-ui,-apple-system,sans-serif'; ctx.fillStyle = '#666'; ctx.textAlign = 'center'
    ctx.fillText('榜单排行', W / 2, listTop - 8)
    ctx.fillStyle = '#eee'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(120, listTop + 2); ctx.lineTo(W - 120, listTop + 2); ctx.stroke()

    const maxC = Math.max(...topDramas.map(x => x.clickCount), 1)
    for (let i = 3; i < topDramas.length; i++) {
      const d = topDramas[i]; const y = listTop + (i - 3) * rowH + 16
      // 行背景（交替）
      if ((i - 3) % 2 === 0) {
        ctx.fillStyle = '#fafafa'; roundRect(ctx, 50, y - 4, W - 100, rowH - 4, 12); ctx.fill()
      }
      // 排名数字
      ctx.font = 'bold 18px system-ui,-apple-system,sans-serif'; ctx.fillStyle = '#ccc'; ctx.textAlign = 'center'
      ctx.fillText(`${i + 1}`, 72, y + rowH / 2 + 6)
      // 缩略图 42x63
      const tw = 42, th = 63
      drawClipCover(ctx, imgs[i], 90, y + (rowH - th) / 2, tw, th, 6)
      // 剧名
      ctx.font = '15px system-ui,-apple-system,sans-serif'; ctx.fillStyle = '#444'; ctx.textAlign = 'left'
      const title = d.title.length > 12 ? d.title.slice(0, 12) + '…' : d.title
      ctx.fillText(title, 150, y + rowH / 2 + 5)
      // 地区
      if (d.region) {
        ctx.font = '11px system-ui,-apple-system,sans-serif'; ctx.fillStyle = '#ccc'
        ctx.fillText(d.region, 350, y + rowH / 2 + 5)
      }
      // 热度数字
      ctx.font = '14px system-ui,-apple-system,sans-serif'; ctx.fillStyle = '#FF7E6B'; ctx.textAlign = 'right'
      const barRight = W - 80, barMaxW = 180
      ctx.fillText(d.clickCount.toLocaleString(), barRight - barMaxW - 10, y + rowH / 2 + 5)
      // 热度进度条
      const bw = Math.max((d.clickCount / maxC) * barMaxW, 3)
      ctx.fillStyle = '#F0E0DD'
      roundRect(ctx, barRight - barMaxW, y + rowH - 16, barMaxW, 5, 2.5); ctx.fill()
      const barG = ctx.createLinearGradient(barRight - barMaxW, 0, barRight, 0)
      barG.addColorStop(0, '#FF7E6B'); barG.addColorStop(1, '#FF9A8B')
      ctx.fillStyle = barG
      roundRect(ctx, barRight - bw, y + rowH - 16, bw, 5, 2.5); ctx.fill()
    }

    // ==================== 底部 ====================
    const botY = H - 65
    ctx.fillStyle = '#f0f0f0'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(150, botY); ctx.lineTo(W - 150, botY); ctx.stroke()
    ctx.font = '12px system-ui,-apple-system,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ccc'
    ctx.fillText(`数据截止至 ${dateRange.end}`, W / 2, botY + 22)
    ctx.font = '13px system-ui,-apple-system,sans-serif'; ctx.fillStyle = '#bbb'
    ctx.fillText('来源：晨光曦·分享站', W / 2, botY + 42)
  }, [stats])

  const downloadPoster = async () => {
    if (!canvasRef.current || !stats) return
    try { await generatePoster(); const link = document.createElement('a')
      link.download = `热度榜_${stats.dateRange.start || ''}.png`
      link.href = canvasRef.current.toDataURL('image/png'); link.click()
    } catch { alert('生成海报失败，请重试') }
  }

  if (loading && !stats) return <p className="text-[var(--text-muted)]">加载中...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">数据统计</h1>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {presetRanges.map(r => (
          <button key={r.label} onClick={() => setPreset(r.label)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${preset === r.label ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}>{r.label}</button>
        ))}
        <span className="text-[var(--text-muted)] text-xs mx-1">自定义</span>
        <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPreset('') }}
          className="px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm" />
        <span className="text-[var(--text-muted)]">—</span>
        <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPreset('') }}
          className="px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm" />
        <button onClick={handleCustomDate} className="px-3 py-1.5 rounded-lg bg-[var(--brand)] text-white text-xs font-medium">查询</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: '区间 PV', val: stats?.periodPv ?? 0 },
          { label: '区间 UV', val: stats?.periodUv ?? 0, acc: true },
          { label: '全部 PV', val: stats?.totalPv ?? 0 },
          { label: '全部 UV', val: stats?.totalUv ?? 0 },
        ].map(s => (
          <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.acc ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>{s.val.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">每日走势</h3>
          {stats && stats.dailyStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 text-[var(--text-muted)] font-medium">日期</th>
                  <th className="text-right py-2 text-[var(--text-muted)] font-medium">PV</th>
                  <th className="text-right py-2 text-[var(--text-muted)] font-medium">UV</th>
                  <th className="hidden md:table-cell py-2"></th>
                </tr></thead>
                <tbody>{stats.dailyStats.map(d => {
                  const mp = Math.max(...stats.dailyStats.map(x => x.pv), 1)
                  return (<tr key={d.date} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="py-1.5 text-[var(--text-secondary)]">{d.date.slice(5)}</td>
                    <td className="py-1.5 text-right text-[var(--text-primary)] font-medium">{d.pv.toLocaleString()}</td>
                    <td className="py-1.5 text-right text-[var(--text-muted)]">{d.uv.toLocaleString()}</td>
                    <td className="hidden md:table-cell py-1.5">
                      <div className="h-3 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--brand)] rounded-full" style={{ width: `${Math.max((d.pv / mp) * 100, 2)}%` }} />
                      </div>
                    </td>
                  </tr>)
                })}</tbody>
              </table>
            </div>
          ) : <p className="text-sm text-[var(--text-muted)] text-center py-4">暂无数据</p>}
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">设备分布</h3>
          {stats && stats.deviceStats.length > 0 ? (
            <div className="space-y-3">
              <div className="flex h-6 rounded-full overflow-hidden">
                {stats.deviceStats.map(d => (
                  <div key={d.type} className={deviceColors[d.type] || 'bg-gray-500'} style={{ width: `${d.percentage}%` }} title={`${d.type}: ${d.percentage}%`} />
                ))}
              </div>
              {stats.deviceStats.map(d => (
                <div key={d.type} className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${deviceColors[d.type] || 'bg-gray-500'}`} />
                  <span className="text-sm text-[var(--text-secondary)] flex-1">{d.type}</span>
                  <span className="text-sm text-[var(--text-primary)] font-medium">{d.count.toLocaleString()}</span>
                  <span className="text-xs text-[var(--text-muted)] w-8 text-right">{d.percentage}%</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-[var(--text-muted)] text-center py-4">暂无数据</p>}
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">剧集热度 TOP 10</h2>
          <button onClick={downloadPoster} className="px-3 py-1 rounded-lg bg-[var(--brand)] text-white text-xs font-medium hover:opacity-90 transition-opacity">下载分享海报</button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
            <th className="text-left px-4 py-2 text-[var(--text-muted)] font-medium w-8">#</th>
            <th className="text-left px-4 py-2 text-[var(--text-muted)] font-medium">剧名</th>
            <th className="text-left px-4 py-2 text-[var(--text-muted)] font-medium">地区</th>
            <th className="text-right px-4 py-2 text-[var(--text-muted)] font-medium">热度</th>
          </tr></thead>
          <tbody>{stats?.topDramas.map((d, i) => (
            <tr key={d.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-secondary)]">
              <td className="px-4 py-2"><span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
              }`}>{i + 1}</span></td>
              <td className="px-4 py-2 text-[var(--text-primary)] font-medium truncate max-w-[160px]">{d.title}</td>
              <td className="px-4 py-2 text-[var(--text-muted)]">{d.region || '-'}</td>
              <td className="px-4 py-2 text-right text-[var(--brand)] font-medium">{d.clickCount.toLocaleString()}</td>
            </tr>
          ))}{(!stats || stats.topDramas.length === 0) && <tr><td colSpan={4} className="text-center py-6 text-[var(--text-muted)]">暂无数据</td></tr>}</tbody>
        </table>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
