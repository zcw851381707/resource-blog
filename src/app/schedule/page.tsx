import { prisma } from '@/lib/prisma'
import WeeklyCalendar from '@/components/WeeklyCalendar'
import { buildWeeklySchedule, hydrateDramaDisplayFields } from '@/lib/drama-schedule'

export default async function SchedulePage() {
  const allDramas = await prisma.drama.findMany({
    orderBy: { createdAt: 'desc' },
  })

  await hydrateDramaDisplayFields(allDramas)
  const schedule = buildWeeklySchedule(allDramas)
  const hasAnySchedule = Object.values(schedule).some(day => day.length > 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">追剧日历</h1>
      <WeeklyCalendar schedule={schedule} />
      {!hasAnySchedule && (
        <div className="text-center py-16 text-[var(--text-muted)]">
          暂无排期更新
        </div>
      )}
    </div>
  )
}
