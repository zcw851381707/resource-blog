import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const prisma = new PrismaClient()
const FEISHU_USER_ID = 'ou_9c5bde1093bb93ee99ae4c528cb90aa2'

function toLocalDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

async function main() {
  const now = new Date()
  const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1
  const todayStr = toLocalDateStr(now)
  const nowMins = now.getHours() * 60 + now.getMinutes()

  // Query all relevant dramas
  const candidates = await prisma.drama.findMany({
    where: {
      OR: [
        { isOnSchedule: true, isCompleted: false, airDays: { not: null } },
        { isUpcoming: true, expectedDate: { not: null } },
      ],
    },
    select: { id: true, title: true, airTime: true, airDays: true, expectedDate: true, currentEpisode: true, manualEpisode: true, episodesPerDay: true, isUpcoming: true, isOnSchedule: true, notifiedAt: true, isSuspended: true, pausedDays: true },
  })

  for (const d of candidates) {
    if (d.isSuspended) continue

    const airTime = d.airTime
    if (!airTime) continue
    const [h, m] = airTime.split(':').map(Number)
    const airMins = h * 60 + m

    // Check if ~5 minutes before air time (within this minute)
    const minsUntilAir = airMins - nowMins
    if (minsUntilAir < 4 || minsUntilAir > 6) continue  // only notify ~5 min before

    // Check if airs today
    let airsToday = false
    if (d.isOnSchedule && d.airDays) {
      const days = d.airDays.split(',').map(s => s.trim())
      if (days.includes(String(todayIdx))) {
        // Check not paused today
        const paused = (d.pausedDays || '').split(',').map(s => s.trim())
        if (!paused.includes(String(todayIdx))) {
          airsToday = true
        }
      }
    }
    if (!airsToday && d.isUpcoming && d.expectedDate) {
      const ed = new Date(d.expectedDate)
      const edDay = ed.getDay() === 0 ? 6 : ed.getDay() - 1
      if (edDay === todayIdx && toLocalDateStr(ed) === todayStr) {
        airsToday = true
      }
    }
    if (!airsToday) continue

    // Check not already notified
    if (d.notifiedAt) {
      const nDate = toLocalDateStr(new Date(d.notifiedAt))
      if (nDate === todayStr) continue
    }

    // Calculate episode
    const ep = d.manualEpisode ?? d.currentEpisode ?? 0
    const nextEp = ep + (d.episodesPerDay || 1)
    const isPremiere = d.isUpcoming

    const epLabel = isPremiere ? '第1集（首播）' : `第${nextEp}集`
    const text = `🔔 ${d.title} ${epLabel} 将在5分钟后播出！${airTime}`

    console.log(`[${now.toISOString()}] Notifying: ${d.title} ${epLabel}`)

    // Send Feishu notification
    try {
      execSync(
        `lark-cli im +messages-send --as bot --user-id ${FEISHU_USER_ID} --text '${text}'`,
        { timeout: 10000, stdio: 'pipe' }
      )
    } catch (e) {
      console.error(`Feishu send failed for ${d.title}:`, String(e))
      continue
    }

    // Mark as notified
    await prisma.$executeRawUnsafe(
      `UPDATE Drama SET notifiedAt = ? WHERE id = ?`, now.toISOString(), d.id
    )
  }

  await prisma.$disconnect()
}

main().catch(e => {
  console.error('Feishu reminder script error:', e)
  process.exit(1)
})
