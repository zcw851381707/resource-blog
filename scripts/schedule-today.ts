/**
 * 追剧通知调度系统
 *
 * --schedule  每小时 cron 触发，扫描今天剩余+明天的排期，用绝对时间轮询触发
 * 无参数      到达播出时间后触发，调用飞书 API 发消息到群
 * --summary   每晚 23:10 触发，推送第二天的追剧清单
 *
 * crontab:
 *   @reboot  ... --schedule   # 开机自动调度
 *   0 * * * * ... --schedule  # 每小时重新调度（兜底恢复）
 *   10 23 * * * ... --summary # 每晚推送第二天清单
 */

import { PrismaClient } from '@prisma/client'
import { spawn } from 'child_process'
import * as fs from 'fs'

const prisma = new PrismaClient()

const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function toLocalISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function toLocalDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Convert a UTC ISO string (from DB) to local date string for comparison */
function utcToLocalDate(utcStr: string | null): string | null {
  if (!utcStr) return null
  return toLocalDateStr(new Date(utcStr))
}

/** UTC ISO string of local midnight today, for SQL boundary comparison */
function localMidnightUTC(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toISOString()
}

function getTodayIndex(): number {
  const d = new Date().getDay()
  return d === 0 ? 6 : d - 1
}

function getProjectDir(): string {
  // 使用 symlink 避免 cron 环境空格截断
  return '/tmp/resource-blog'
}

// ============ 飞书 API ============

interface LarkConfig {
  appId: string
  appSecret: string
  chatId: string
}

async function getLarkConfig(): Promise<LarkConfig | null> {
  const rows = await prisma.$queryRawUnsafe<Array<{
    larkAppId: string | null; larkAppSecret: string | null; larkChatId: string | null
  }>>(`SELECT larkAppId, larkAppSecret, larkChatId FROM SiteSettings LIMIT 1`)
  const r = rows[0]
  if (r?.larkAppId && r?.larkAppSecret && r?.larkChatId) {
    return { appId: r.larkAppId, appSecret: r.larkAppSecret, chatId: r.larkChatId }
  }
  return null
}

let cachedToken = ''
let tokenExpireAt = 0

async function getAccessToken(config: LarkConfig): Promise<string> {
  if (cachedToken && Date.now() < tokenExpireAt - 60000) return cachedToken

  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: config.appId, app_secret: config.appSecret }),
  })
  const data = await res.json()
  if (data.code !== 0) throw new Error(`token error: ${data.msg}`)
  cachedToken = data.tenant_access_token
  tokenExpireAt = Date.now() + (data.expire - 60) * 1000
  return cachedToken
}

async function sendLarkMessage(config: LarkConfig, drama: {
  title: string; slug: string; airTime: string | null
  currentEpisode: number | null; manualEpisode: number | null
  totalEpisodes: number | null; region: string | null; isNewlyAired: boolean
}) {
  const token = await getAccessToken(config)
  const ep = drama.manualEpisode ?? drama.currentEpisode
  const epText = ep ? `第${ep}集` : ''
  const totalText = drama.totalEpisodes ? `共${drama.totalEpisodes}集` : ''
  const tagText = drama.isNewlyAired ? ' 🆕新播' : ''
  const regionText = drama.region ? `[${drama.region}] ` : ''
  const timeText = drama.airTime ? `\n⏰ ${drama.airTime}` : ''

  const text = `📺 ${regionText}${drama.title} 开播了！${tagText}\n${epText} ${totalText}${timeText}`

  const res = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receive_id: config.chatId,
      msg_type: 'text',
      content: JSON.stringify({ text }),
    }),
  })
  const data = await res.json()
  console.log(`[send] "${drama.title}": code=${data.code}`)
  return data.code === 0
}

// ============ 发送模式（由 at 触发）============

async function sendMode() {
  const config = await getLarkConfig()
  if (!config) {
    console.log('[send] no lark config, skip')
    await prisma.$disconnect()
    return
  }

  const todayIdx = getTodayIndex()
  const now = new Date()
  const todayStr = toLocalDateStr(now)

  // 常规追剧中 + 即将上线（仅精确到天的首播日当天）
  const candidates = await prisma.drama.findMany({
    where: {
      OR: [
        { isOnSchedule: true, isCompleted: false, airDays: { not: null } },
        { isUpcoming: true, expectedDate: { not: null }, expectedPrecision: 'day' },
      ],
    },
  })

  for (const d of candidates) {
    // 检查今天是否播出日
    const isUpcomingPremiere = d.isUpcoming && d.expectedDate && (() => {
      const ed = new Date(d.expectedDate)
      const edDay = ed.getDay() === 0 ? 6 : ed.getDay() - 1
      return edDay === todayIdx
    })()

    if (!isUpcomingPremiere) {
      // 常规追剧：检查 airDays
      const days = (d.airDays || '').split(',').map(s => s.trim())
      if (!days.includes(String(todayIdx))) continue
    }

    const airTime = d.airTime || ''
    const [h, m] = airTime.split(':')
    const airMinutes = parseInt(h || '0') * 60 + parseInt(m || '0')
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const timeDiff = nowMinutes - airMinutes
    // 2 分钟容差：系统休眠恢复后可能晚几十秒 (没有 airTime 的首播剧也允许)
    if (airTime && (timeDiff < 0 || timeDiff > 2)) continue

    const rows = await prisma.$queryRawUnsafe<Array<{ notifiedAt: string | Date | null }>>(
      `SELECT notifiedAt FROM Drama WHERE id = ?`, d.id
    )
    const lastNotified = rows[0]?.notifiedAt
    if (lastNotified && utcToLocalDate(String(lastNotified)) === todayStr) {
      console.log(`[send] skip "${d.title}" — already notified today`)
      continue
    }

    // 原子更新：只有 notifiedAt 不是今天才更新，防止并发重复加集数
    const nextEp = (d.currentEpisode || 0) + 1
    const todayStart = localMidnightUTC(todayStr)
    let affected = 0
    if (isUpcomingPremiere) {
      affected = await prisma.$executeRawUnsafe(
        `UPDATE Drama SET notifiedAt = ?, currentEpisode = 1, isNewlyAired = 1, isUpcoming = 0, isOnSchedule = 1, airDays = ? WHERE id = ? AND (notifiedAt IS NULL OR notifiedAt < ?)`,
        now.toISOString(), String(todayIdx), d.id, todayStart
      )
      if (affected > 0) {
        d.currentEpisode = 1
        console.log(`[send] "${d.title}" 首播 → 第1集`)
      } else {
        console.log(`[send] skip "${d.title}" — 已被其他进程更新`)
        continue
      }
    } else {
      affected = await prisma.$executeRawUnsafe(
        `UPDATE Drama SET notifiedAt = ?, currentEpisode = COALESCE(currentEpisode, 0) + 1, manualEpisode = NULL WHERE id = ? AND (notifiedAt IS NULL OR notifiedAt < ?)`,
        now.toISOString(), d.id, todayStart
      )
      if (affected > 0) {
        d.currentEpisode = nextEp
        console.log(`[send] "${d.title}" → 第${nextEp}集`)
      } else {
        console.log(`[send] skip "${d.title}" — 已被其他进程更新`)
        continue
      }
    }

    // 发送飞书通知（发送失败不影响集数更新）
    await sendLarkMessage(config, {
      title: d.title, slug: d.slug, airTime: d.airTime || null,
      currentEpisode: d.currentEpisode, manualEpisode: d.manualEpisode,
      totalEpisodes: d.totalEpisodes, region: d.region || null,
      isNewlyAired: d.isNewlyAired,
    })
  }

  console.log('[send] check done')
  await prisma.$disconnect()
}

// ============ 每日汇总（每晚 23:10 由 cron 触发，推送第二天清单）============

async function summaryMode() {
  const config = await getLarkConfig()
  if (!config) {
    console.log('[summary] no lark config, skip')
    await prisma.$disconnect()
    return
  }

  const todayIdx = getTodayIndex()
  const tomorrowIdx = (todayIdx + 1) % 7

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const month = tomorrow.getMonth() + 1
  const date = tomorrow.getDate()

  const candidates = await prisma.drama.findMany({
    where: {
      OR: [
        { isOnSchedule: true, isCompleted: false, airDays: { not: null } },
        { isUpcoming: true, expectedDate: { not: null } },
      ],
    },
  })

  // 筛选第二天播出的剧，按时间分组
  const timeGroups = new Map<string, Array<{
    title: string; ep: number | null; total: number | null; isNewlyAired: boolean
    isUpcoming: boolean; expectedDate: string | null; region: string | null
  }>>()

  for (const d of candidates) {
    let match = false

    // 即将上线：检查 expectedDate 是否对应明天
    if (d.isUpcoming && d.expectedDate) {
      const ed = new Date(d.expectedDate)
      const edDay = ed.getDay() === 0 ? 6 : ed.getDay() - 1
      if (edDay === tomorrowIdx) match = true
    }

    // 常规追剧：检查 airDays
    if (!match) {
      const days = (d.airDays || '').split(',').map(s => s.trim())
      if (!days.includes(String(tomorrowIdx))) continue
      if (!d.airTime && !d.isUpcoming) continue
    }

    const ep = d.manualEpisode ?? d.currentEpisode
    const timeKey = d.airTime ? d.airTime.substring(0, 5) : '首播'
    if (!timeGroups.has(timeKey)) timeGroups.set(timeKey, [])
    timeGroups.get(timeKey)!.push({
      title: d.title,
      ep: match ? 1 : ep,
      total: d.totalEpisodes,
      isNewlyAired: d.isNewlyAired,
      isUpcoming: d.isUpcoming,
      expectedDate: d.expectedDate ? new Date(d.expectedDate).toISOString() : null,
      region: d.region || null,
    })
  }

  if (timeGroups.size === 0) {
    console.log('[summary] 明天没有追剧排期')
    await prisma.$disconnect()
    return
  }

  // 按时间排序
  const sortedTimes = Array.from(timeGroups.keys()).sort()

  let text = `📋 明日追剧清单（${month}月${date}日 ${dayNames[tomorrowIdx]}）\n\n`
  for (const time of sortedTimes) {
    const dramas = timeGroups.get(time)!
    text += `⏰ ${time}\n`
    for (const d of dramas) {
      const regionTag = d.region ? `[${d.region}] ` : ''
      let epText = ''
      if (d.isUpcoming) {
        epText = '🆕首播'
      } else {
        epText = d.total ? `第${d.ep || '?'}集/全${d.total}集` : d.ep ? `第${d.ep}集` : ''
      }
      text += `  ${regionTag}${d.title}  ${epText}\n`
    }
    text += '\n'
  }
  text += '---\n各时段开播时将单独通知 📢'

  const token = await getAccessToken(config)
  const res = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      receive_id: config.chatId,
      msg_type: 'text',
      content: JSON.stringify({ text }),
    }),
  })
  const data = await res.json()
  console.log(`[summary] sent, code=${data.code}, ${timeGroups.size}个时段 ${Array.from(timeGroups.values()).reduce((s, g) => s + g.length, 0)}部剧`)
  await prisma.$disconnect()
}

// ============ 调度去重 ============
// 防止每小时 cron 重复调度同一个 (日期, 时间) 组合

const SCHEDULE_TRACKER = '/tmp/notify-scheduled.json'

function loadScheduled(): Record<string, string[]> {
  try {
    if (fs.existsSync(SCHEDULE_TRACKER)) {
      return JSON.parse(fs.readFileSync(SCHEDULE_TRACKER, 'utf-8'))
    }
  } catch {}
  return {}
}

function markScheduled(dateStr: string, timeKey: string) {
  const data = loadScheduled()
  // 清理过期条目（保留今天及之后的）
  const today = toLocalDateStr(new Date())
  for (const k of Object.keys(data)) {
    if (k < today) delete data[k]
  }
  if (!data[dateStr]) data[dateStr] = []
  if (!data[dateStr].includes(timeKey)) {
    data[dateStr].push(timeKey)
    fs.writeFileSync(SCHEDULE_TRACKER, JSON.stringify(data))
  }
}

function isAlreadyScheduled(dateStr: string, timeKey: string): boolean {
  const data = loadScheduled()
  return (data[dateStr] || []).includes(timeKey)
}

// ============ 调度模式（每小时由 cron 触发）============
// 扫描「今天剩余」+「明天」的排期，避免错过 23:00 就漏掉第二天

async function scheduleForDay(dayIdx: number, dateStr: string, dateObj: Date, label: string) {
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const todayStr = toLocalDateStr(now)
  const projectDir = getProjectDir()
  const nodeBin = '/usr/local/bin/node'
  const tsxBin = `${projectDir}/node_modules/tsx/dist/cli.mjs`
  const scriptPath = `${projectDir}/scripts/schedule-today.ts`
  const logPath = '/tmp/notify-airing.log'

  const candidates = await prisma.drama.findMany({
    where: {
      OR: [
        { isOnSchedule: true, isCompleted: false, airDays: { not: null } },
        { isUpcoming: true, expectedDate: { not: null } },
      ],
    },
  })

  const timeGroups = new Map<string, string[]>()
  for (const d of candidates) {
    // 即将上线：检查 expectedDate 是否对应今天
    const isUpcomingPremiere = d.isUpcoming && d.expectedDate && (() => {
      const ed = new Date(d.expectedDate)
      const edDay = ed.getDay() === 0 ? 6 : ed.getDay() - 1
      return edDay === dayIdx
    })()
    if (!isUpcomingPremiere) {
      // 常规追剧：检查 airDays
      const days = (d.airDays || '').split(',').map(s => s.trim())
      if (!days.includes(String(dayIdx))) continue
      if (!d.airTime) continue
    }
    // 即将上线的剧没有 airTime 也可以调度（用 00:00）
    const airTime = d.airTime || '00:00'

    // 如果是今天且播出时间已过，跳过
    const [h, m] = airTime.split(':')
    const airMinutes = parseInt(h) * 60 + parseInt(m || '0')
    if (dateStr === todayStr && airMinutes <= nowMinutes) continue

    // 检查是否已通知过
    const rows = await prisma.$queryRawUnsafe<Array<{ notifiedAt: string | Date | null }>>(
      `SELECT notifiedAt FROM Drama WHERE id = ?`, d.id
    )
    const lastNotified = rows[0]?.notifiedAt
    if (lastNotified && utcToLocalDate(String(lastNotified)) === dateStr) continue

    const timeKey = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`
    if (!timeGroups.has(timeKey)) timeGroups.set(timeKey, [])
    timeGroups.get(timeKey)!.push(d.title)
  }

  if (timeGroups.size === 0) {
    console.log(`[schedule] ${label} ${dayNames[dayIdx]} 没有需要通知的追剧`)
    return
  }

  for (const [timeKey, titles] of timeGroups) {
    // 去重：同一个 (日期, 时间) 只需调度一次
    if (isAlreadyScheduled(dateStr, timeKey)) {
      console.log(`[schedule] ⊘ ${label} ${dayNames[dayIdx]} ${timeKey} 已调度过，跳过 — ${titles.join('、')}`)
      continue
    }
    markScheduled(dateStr, timeKey)

    const [hh, mm] = timeKey.split(':').map(Number)
    // 用绝对时间轮询代替 sleep N，解决 macOS 休眠导致 sleep 暂停的问题
    // 每 10 秒检查一次时钟，休眠恢复后能立即感知时间已过
    const child = spawn('nohup', [
      'sh', '-c',
      `t=$(date -j -f "%Y-%m-%d %H:%M" "${dateStr} ${timeKey}" +%s); while [ $(date +%s) -lt $t ]; do sleep 10; done; if [ $(date +%s) -gt $((t + 7200)) ]; then exit 0; fi; ${nodeBin} ${tsxBin} ${scriptPath} >> ${logPath} 2>&1`
    ], { detached: true, stdio: 'ignore' })
    child.unref()

    const target = new Date(dateObj)
    target.setHours(hh, mm, 0, 0)
    const delaySec = Math.max(1, Math.round((target.getTime() - now.getTime()) / 1000))
    console.log(`[schedule] ✓ ${label} ${dayNames[dayIdx]} ${timeKey} (约${Math.round(delaySec / 60)}分钟后) — ${titles.join('、')}`)
  }
}

async function scheduleMode() {
  const now = new Date()
  const todayIdx = getTodayIndex()
  const todayStr = toLocalDateStr(now)

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowIdx = (todayIdx + 1) % 7
  const tomorrowStr = toLocalDateStr(tomorrow)

  // 今天剩余的 + 明天的
  await scheduleForDay(todayIdx, todayStr, now, '今天')
  await scheduleForDay(tomorrowIdx, tomorrowStr, tomorrow, '明天')

  await prisma.$disconnect()
}

// ============ main ============

async function main() {
  if (process.argv.includes('--summary')) {
    await summaryMode()
  } else if (process.argv.includes('--schedule')) {
    await scheduleMode()
  } else if (process.argv.includes('--update')) {
    // 批量更新集数：每小时跑一次，兜底 sendMode 漏掉的情况
    const { updateEpisodesBatch } = await import('./update-episodes')
    await updateEpisodesBatch()
  } else {
    await sendMode()
  }
}

main().catch(err => {
  console.error('[notify] error:', err)
  process.exit(1)
})
