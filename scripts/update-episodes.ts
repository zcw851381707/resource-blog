import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateEpisodes() {
  const now = new Date()
  const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1
  const todayKey = String(todayIdx)
  const yesterdayIdx = todayIdx === 0 ? 6 : todayIdx - 1
  const yesterdayKey = String(yesterdayIdx)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const todayStr = toLocalDateStr(now)

  const dramas = await prisma.drama.findMany({
    where: { isOnSchedule: true, airTime: { not: null }, airDays: { not: null } },
    select: { id: true, title: true, currentEpisode: true, episodesPerDay: true, airDays: true, airTime: true, lastEpisodeUpdate: true, pausedDays: true, isSuspended: true }
  })

  const updates: { id: string; title: string; oldEp: number | null; newEp: number; airedDays: string[] }[] = []

  for (const d of dramas) {
    const airDayIndices = (d.airDays || '').split(',').map(s => s.trim()).filter(Boolean)
    if (!d.airTime) continue

    const [ah, am] = d.airTime.split(':').map(Number)
    const airMins = ah * 60 + am

    const lastUpdate = d.lastEpisodeUpdate ? new Date(d.lastEpisodeUpdate) : null
    const lastUpdateStr = lastUpdate ? toLocalDateStr(lastUpdate) : null

    // 暂缓播出跳过
    if (d.isSuspended) continue

    // 停播日跳过
    const pausedIndices = (d.pausedDays || '').split(',').map(s => s.trim()).filter(Boolean)
    if (pausedIndices.includes(todayKey)) continue

    // 主判断：今天是播出日且播出时间已过
    let shouldUpdate = airDayIndices.includes(todayKey) && currentMinutes >= airMins

    // 补更：昨天 23:30 之后播出的剧（定时任务最晚 23:30 会漏掉）
    if (!shouldUpdate && airDayIndices.includes(yesterdayKey) && airMins > 1410 && !pausedIndices.includes(yesterdayKey)) {
      const yesterdayStr = toLocalDateStr(new Date(now.getTime() - 86400000))
      if (lastUpdateStr !== yesterdayStr) {
        shouldUpdate = true
      }
    }

    if (!shouldUpdate) continue
    if (lastUpdateStr === todayStr) continue

    const epd = d.episodesPerDay || 1
    const newEp = (d.currentEpisode || 0) + epd

    updates.push({ id: d.id, title: d.title, oldEp: d.currentEpisode, newEp, airedDays: airDayIndices })
  }

  for (const u of updates) {
    await prisma.drama.update({
      where: { id: u.id },
      data: { currentEpisode: u.newEp, lastEpisodeUpdate: now }
    })
  }

  console.log(`[${now.toISOString()}] Updated ${updates.length} episodes:`)
  for (const u of updates) {
    console.log(`  ${u.title}: ${u.oldEp} → ${u.newEp}`)
  }

  // 首播剧自动过渡：expectedDate 已到且播出时间已过 → 从「即将上线」移到「最新上线」
  const premieres = await prisma.drama.findMany({
    where: { isUpcoming: true, expectedDate: { not: null }, expectedPrecision: 'day' },
    select: { id: true, title: true, expectedDate: true, airTime: true, airDays: true, currentEpisode: true }
  })

  const transitions: string[] = []
  for (const p of premieres) {
    const expectedDate = new Date(p.expectedDate!)
    const expectedDay = toLocalDateStr(expectedDate)
    if (expectedDay > todayStr) continue

    // 首播周已过（周日已过），跳过（占位日期/历史数据，不应自动过渡）
    const expectedDayIdx = expectedDate.getDay() === 0 ? 6 : expectedDate.getDay() - 1
    const monday = new Date(expectedDate)
    monday.setDate(expectedDate.getDate() - expectedDayIdx)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    if (now > sunday) continue

    if (p.airTime) {
      const [ah, am] = p.airTime.split(':').map(Number)
      if (currentMinutes < ah * 60 + am) continue
    }

    await prisma.drama.update({
      where: { id: p.id },
      data: {
        isUpcoming: false,
        isNewlyAired: true,
        isOnSchedule: p.airDays ? true : undefined,
        currentEpisode: p.currentEpisode ?? 1
      }
    })
    transitions.push(p.title)
  }

  if (transitions.length > 0) {
    console.log(`Premieres transitioned: ${transitions.join(', ')}`)
  }

  await prisma.$disconnect()
}

updateEpisodes().catch(e => {
  console.error(e)
  process.exit(1)
})
