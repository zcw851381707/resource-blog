/**
 * 数据诊断脚本 — 全面检查所有 Drama 的数据一致性
 * 用法：npx tsx scripts/diagnose.ts
 * 只检查，不改数据，不写文件。
 */
import { prisma } from '../src/lib/prisma'

async function main() {
  const all = await prisma.drama.findMany({ orderBy: { title: 'asc' } })
  console.log(`数据库共 ${all.length} 部剧\n`)

  let issues = 0

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. 无标题
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('━'.repeat(60))
  console.log('1. 无标题')
  console.log('━'.repeat(60))
  const noTitle = all.filter(d => !d.title || d.title.trim() === '')
  if (noTitle.length > 0) {
    issues += noTitle.length
    for (const d of noTitle) console.log(`  ❌ slug=${d.slug}`)
  } else console.log('  ✅ 全部正常')

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. 隐形剧（不在任何分类）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n' + '━'.repeat(60))
  console.log('2. 隐形剧（不是完结、不是即将、不是在播）')
  console.log('━'.repeat(60))
  const invisible = all.filter(d => !d.isCompleted && !d.isUpcoming && !d.isOnSchedule)
  if (invisible.length > 0) {
    issues += invisible.length
    for (const d of invisible) {
      const parts = []
      if (d.isNewlyAired) parts.push('有"新播"标签但无分类')
      if (!d.startDate) parts.push('无首播日')
      if (!d.airDays || d.airDays.trim() === '') parts.push('无播出日')
      console.log(`  ❌ ${d.title || '(无标题)'} — ${parts.join('，') || '字段全部为空'}`)
    }
  } else console.log('  ✅ 全部正常')

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. isUpcoming=1 但日期+时间已过
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n' + '━'.repeat(60))
  console.log('3. "即将上线"但首播日期+播出时间已过')
  console.log('━'.repeat(60))
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const expired = all.filter(d => {
    if (!d.isUpcoming || !d.startDate) return false
    const start = new Date(d.startDate)
    start.setHours(0, 0, 0, 0)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (start < today) return true // 昨天之前
    if (start > today) return false // 明天之后
    // 今天：检查播出时间
    if (!d.airTime) return true // 没设播出时间，按 00:00 算
    const [h, m] = d.airTime.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return true
    return nowMins >= h * 60 + m
  })
  if (expired.length > 0) {
    issues += expired.length
    for (const d of expired) {
      console.log(`  ❌ ${d.title} — 首播 ${d.startDate?.toISOString().slice(0, 10)} ${d.airTime || '(无播出时间)'}`)
    }
  } else console.log('  ✅ 全部正常')

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. 非完结剧缺少 airDays
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n' + '━'.repeat(60))
  console.log('4. 缺少 airDays（不会出现在日历）')
  console.log('━'.repeat(60))
  const noAirDays = all.filter(d => (!d.airDays || d.airDays.trim() === '') && !d.isCompleted)
  if (noAirDays.length > 0) {
    issues += noAirDays.length
    for (const d of noAirDays) {
      const dateStr = d.startDate ? d.startDate.toISOString().slice(0, 10) : '无首播日'
      console.log(`  ⚠️  ${d.title || '(无标题)'} — ${dateStr}`)
    }
  } else console.log('  ✅ 全部正常')

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. currentEpisode > totalEpisodes
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n' + '━'.repeat(60))
  console.log('5. currentEpisode > totalEpisodes')
  console.log('━'.repeat(60))
  const overTotal = all.filter(d => d.totalEpisodes && d.totalEpisodes > 0 && (d.currentEpisode || 0) > d.totalEpisodes)
  if (overTotal.length > 0) {
    issues += overTotal.length
    for (const d of overTotal) console.log(`  ❌ ${d.title} — cur=${d.currentEpisode} > tot=${d.totalEpisodes}`)
  } else console.log('  ✅ 全部正常')

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. isOnSchedule=1 但 airDays 为空
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n' + '━'.repeat(60))
  console.log('6. 在播但无播出日')
  console.log('━'.repeat(60))
  const scheduleNoAir = all.filter(d => d.isOnSchedule && !d.isCompleted && (!d.airDays || d.airDays.trim() === ''))
  if (scheduleNoAir.length > 0) {
    issues += scheduleNoAir.length
    for (const d of scheduleNoAir) console.log(`  ❌ ${d.title} — 在播但 airDays 为空`)
  } else console.log('  ✅ 全部正常')

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 统计
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n' + '━'.repeat(60))
  const completed = all.filter(d => d.isCompleted).length
  const upcoming = all.filter(d => d.isUpcoming).length
  const airing = all.filter(d => !d.isCompleted && !d.isUpcoming && d.isOnSchedule).length
  console.log(`状态分布: 已完结=${completed}  即将上线=${upcoming}  在播=${airing}`)
  console.log(`问题总数: ${issues}`)
  console.log('━'.repeat(60))

  await prisma.$disconnect()
  process.exit(issues > 0 ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })