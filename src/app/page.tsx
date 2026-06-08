import { prisma } from '@/lib/prisma'
import HeroBanner from '@/components/HeroBanner'
import AnnouncementBar from '@/components/AnnouncementBar'
import WeeklyCalendar from '@/components/WeeklyCalendar'
import DramaCard from '@/components/DramaCard'
import RegionSection from '@/components/RegionSection'
import SocialSection from '@/components/SocialSection'
import ScrollReveal from '@/components/ScrollReveal'
import FullRowGrid from '@/components/FullRowGrid'
import HorizontalSlider from '@/components/HorizontalSlider'
import Link from 'next/link'
import { buildWeeklySchedule, hydrateDramaDisplayFields } from '@/lib/drama-schedule'

const regions = [
  { key: '中国', label: '中国', includes: ['中国', '中国台湾', '中国香港', '中国澳门'] },
  { key: '泰国', label: '泰剧', includes: ['泰国'] },
  { key: '韩国', label: '韩剧', includes: ['韩国'] },
  { key: '日本', label: '日剧', includes: ['日本'] },
  { key: '其他', label: '其他', includes: ['越南', '缅甸', '菲律宾', '新加坡', '其他地区'] },
]

export default async function Home() {
  const [banners, announcements, allDramas, latestDramas, upcomingDramas, socials] = await Promise.all([
    prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.announcement.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.drama.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.drama.findMany({
      where: {
        isNewlyAired: true,
        OR: [
          { isCompleted: false },
          { completedAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } },
          { isCompleted: true, completedAt: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.drama.findMany({
      where: { isUpcoming: true },
    }),
    prisma.socialLink.findMany({
      orderBy: { sortOrder: 'asc' },
    }),
  ])

  // 即将上线排序：日 > 月 > 年 > 敬请期待，同精度内按 expectedDate → airTime
  const precisionOrder: Record<string, number> = { day: 0, month: 1, year: 2, tbd: 3 }
  upcomingDramas.sort((a, b) => {
    const pa = precisionOrder[a.expectedPrecision || 'day'] ?? 0
    const pb = precisionOrder[b.expectedPrecision || 'day'] ?? 0
    if (pa !== pb) return pa - pb
    const da = new Date(a.expectedDate || 0).getTime()
    const db = new Date(b.expectedDate || 0).getTime()
    if (da !== db) return da - db
    return (a.airTime || '').localeCompare(b.airTime || '')
  })

  await hydrateDramaDisplayFields(allDramas)
  await hydrateDramaDisplayFields(latestDramas)
  await hydrateDramaDisplayFields(upcomingDramas)

  const schedule = buildWeeklySchedule(allDramas)

  // 地区分组
  const regionData: Record<string, typeof allDramas> = {}
  for (const r of regions) {
    regionData[r.key] = allDramas
      .filter(d => {
        const dramaRegions = (d.region || '').split(',').filter(Boolean)
        return dramaRegions.some(rr => r.includes.includes(rr))
      })
      .slice(0, 10)
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-8">
      {/* Hero Banner */}
      <HeroBanner banners={banners} />

      {/* 公告栏 */}
      {announcements && (
        <AnnouncementBar content={announcements.content} />
      )}

      {/* 追剧日历 */}
      <WeeklyCalendar schedule={schedule} />

      {/* 最新上线 */}
      {latestDramas.length > 0 && (
        <ScrollReveal delay={0}>
          <section>
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-3 text-center">最新上线</h2>
            <FullRowGrid className="drama-grid">
              {latestDramas.map(d => (
                <DramaCard key={d.id} drama={d} />
              ))}
            </FullRowGrid>
            <div className="flex justify-center mt-5">
              <Link href="/all?tag=new" className="px-10 py-2.5 rounded-full border-2 border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--brand)] hover:border-[var(--brand)] transition-all duration-200 flex items-center gap-1.5">
                查看更多 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </section>
        </ScrollReveal>
      )}

      {/* 即将上线 */}
      {upcomingDramas.length > 0 && (
        <ScrollReveal delay={100}>
          <section>
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-3 text-center">即将上线</h2>
            <HorizontalSlider timeline={upcomingDramas.map(d => {
              if (!d.expectedDate) return null
              const date = new Date(d.expectedDate)
              const precision = d.expectedPrecision || 'day'
              if (precision === 'year') return `${date.getFullYear()}年`
              if (precision === 'month') return `${date.getMonth() + 1}月`
              return `${date.getMonth() + 1}月${date.getDate()}日`
            })}>
              {upcomingDramas.map(d => (
                <DramaCard key={d.id} drama={d} />
              ))}
            </HorizontalSlider>
            <div className="flex justify-center mt-5">
              <Link href="/all?tag=upcoming" className="px-10 py-2.5 rounded-full border-2 border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--brand)] hover:border-[var(--brand)] transition-all duration-200 flex items-center gap-1.5">
                查看更多 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </section>
        </ScrollReveal>
      )}

      {/* 地区分组 */}
      {regions.map((r, i) => (
        <ScrollReveal key={r.key} delay={150 + i * 50}>
          <RegionSection
            title={r.label}
            dramas={regionData[r.key]}
            regionKey={r.key}
          />
        </ScrollReveal>
      ))}

      {/* 关注我 */}
      <SocialSection socials={socials} />
    </div>
  )
}
