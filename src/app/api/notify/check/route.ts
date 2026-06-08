import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function toLocalDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function utcToLocalDate(utcStr: string | null): string | null {
  if (!utcStr) return null
  return toLocalDateStr(new Date(utcStr))
}

const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function getTodayIndex(): number {
  const d = new Date().getDay()
  return d === 0 ? 6 : d - 1
}

function normalizeTime(t: string | null): string | null {
  if (!t) return null
  const [h, m] = t.split(':')
  return `${h.padStart(2, '0')}:${(m || '0').padStart(2, '0')}`
}

function timeMatches(airTime: string | null, nowTime: string): boolean {
  if (!airTime) return false
  const norm = normalizeTime(airTime)
  if (!norm) return false
  const [ah, am] = norm.split(':').map(Number)
  const [nh, nm] = nowTime.split(':').map(Number)
  return Math.abs(ah * 60 + am - (nh * 60 + nm)) <= 1
}

async function getWebhookUrl(): Promise<string | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ larkWebhookUrl: string | null }>>(
      `SELECT larkWebhookUrl FROM SiteSettings LIMIT 1`
    )
    if (rows[0]?.larkWebhookUrl) return rows[0].larkWebhookUrl
  } catch { /* */ }
  return process.env.LARK_WEBHOOK_URL || null
}

async function sendLarkMessage(webhookUrl: string, drama: {
  id: string; title: string; slug: string; airTime: string | null
  currentEpisode: number | null; manualEpisode: number | null
  totalEpisodes: number | null; region: string | null; isNewlyAired: boolean
}) {
  const ep = drama.manualEpisode ?? drama.currentEpisode
  const epText = ep ? `第${ep}集` : ''
  const totalText = drama.totalEpisodes ? `共${drama.totalEpisodes}集` : ''
  const tagText = drama.isNewlyAired ? ' 🆕新播' : ''
  const regionText = drama.region ? `[${drama.region}] ` : ''

  const body = {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: `📺 追剧提醒 — ${drama.title}开播了！` },
        template: 'blue' as const,
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**${regionText}${drama.title}**${tagText}\n${drama.airTime || ''} ${epText} ${totalText}`,
          },
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '查看详情' },
              type: 'primary',
              url: `https://your-domain.com/drama/${drama.slug}`,
            },
          ],
        },
      ],
    },
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { ok: res.ok, status: res.status, text: await res.text() }
}

export async function GET() {
  const webhookUrl = await getWebhookUrl()
  if (!webhookUrl) {
    return NextResponse.json({ error: '未配置飞书 Webhook 地址' }, { status: 400 })
  }

  const todayIdx = getTodayIndex()
  const now = new Date()
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const todayStr = toLocalDateStr(now)

  const candidates = await prisma.drama.findMany({
    where: { isOnSchedule: true, airDays: { not: null } },
  })

  const results: string[] = []
  const notified: string[] = []

  for (const d of candidates) {
    const days = (d.airDays || '').split(',').map(s => s.trim())
    if (!days.includes(String(todayIdx))) continue
    if (!timeMatches(d.airTime || null, nowTime)) continue

    const rows = await prisma.$queryRawUnsafe<Array<{ notifiedAt: string | null }>>(
      `SELECT notifiedAt FROM Drama WHERE id = ?`, d.id
    )
    if (rows[0]?.notifiedAt && utcToLocalDate(rows[0].notifiedAt) === todayStr) {
      results.push(`跳过「${d.title}」— 今日已通知`)
      continue
    }

    const r = await sendLarkMessage(webhookUrl, {
      id: d.id, title: d.title, slug: d.slug,
      airTime: d.airTime || null,
      currentEpisode: d.currentEpisode, manualEpisode: d.manualEpisode,
      totalEpisodes: d.totalEpisodes, region: d.region || null,
      isNewlyAired: d.isNewlyAired,
    })

    if (r.ok) {
      await prisma.$executeRawUnsafe(
        `UPDATE Drama SET notifiedAt = ? WHERE id = ?`, now.toISOString(), d.id
      )
      notified.push(d.title)
    } else {
      results.push(`失败「${d.title}」: ${r.status} ${r.text}`)
    }
  }

  if (notified.length > 0) results.unshift(`已通知: ${notified.join('、')}`)
  if (results.length === 0) results.push(`${nowTime} ${dayNames[todayIdx]} — 无需要通知的剧集`)

  return NextResponse.json({ time: nowTime, day: dayNames[todayIdx], results })
}
