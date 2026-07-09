import { PrismaClient } from '@prisma/client'
import { isUpcomingActive } from '../src/lib/drama-schedule.ts'

const prisma = new PrismaClient()
const all = await prisma.drama.findMany({ where: { isUpcoming: true } })
const filtered = all.filter(d => isUpcomingActive(d))
const excluded = all.filter(d => !isUpcomingActive(d))

console.log(`isUpcoming=1 共 ${all.length} 部`)
console.log(`isUpcomingActive 通过: ${filtered.length} 部`)
console.log(`isUpcomingActive 排除: ${excluded.length} 部`)
if (excluded.length > 0) {
  console.log('被排除的:')
  excluded.forEach(d => console.log(`  ${d.title || '(无标题)'} start=${d.startDate?.toISOString().slice(0,10)} exp=${d.expectedDate?.toISOString().slice(0,10)}`))
}
await prisma.$disconnect()
