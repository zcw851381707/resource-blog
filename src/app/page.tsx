import { prisma } from '@/lib/prisma'
import HeroBanner from '@/components/HeroBanner'
import AnnouncementBar from '@/components/AnnouncementBar'
import WeeklyCalendar from '@/components/WeeklyCalendar'
import DramaCard from '@/components/DramaCard'
import RegionSection from '@/components/RegionSection'
import ArticleSection from '@/components/ArticleSection'
import SocialSection from '@/components/SocialSection'
import ScrollReveal from '@/components/ScrollReveal'
import FullRowGrid from '@/components/FullRowGrid'
import HorizontalSlider from '@/components/HorizontalSlider'
import Link from 'next/link'
import { buildWeeklySchedule, hydrateDramaDisplayFields, isNewlyAiredActive } from '@/lib/drama-schedule'

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
      take: 30, // 取多一些，后面按 45 天规则过滤
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

  // 新播标签 45 天自动过期
  const activeLatestDramas = latestDramas.filter(d => isNewlyAiredActive(d)).slice(0, 10)

  const schedule = buildWeeklySchedule(allDramas)


  // 地区分组
  const regionData: Record<string, typeof allDramas> = {}
  for (const r of regions) {
    const now = new Date()
    const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    regionData[r.key] = allDramas
      .filter(d => {
        const dramaRegions = (d.region || '').split(',').filter(Boolean)
        return dramaRegions.some(rr => r.includes.includes(rr))
      })
      .sort((a, b) => {
        const aHasSchedule = a.isOnSchedule && a.airDays && a.airTime &&
          a.airDays.split(',').map(x => x.trim()).includes(String(todayIdx))
        const bHasSchedule = b.isOnSchedule && b.airDays && b.airTime &&
          b.airDays.split(',').map(x => x.trim()).includes(String(todayIdx))

        // 两部今天都不播 → sortOrder（小在前）→ 热度
        if (!aHasSchedule && !bHasSchedule) {
          return (a.sortOrder || 0) - (b.sortOrder || 0) || (b.clickCount || 0) - (a.clickCount || 0)
        }
        // 一部今天播 → 排前面
        if (aHasSchedule && !bHasSchedule) return -1
        if (!aHasSchedule && bHasSchedule) return 1

        // 两部今天都播 → 按播出时间排序
        const [ah, am] = a.airTime!.split(':').map(Number)
        const [bh, bm] = b.airTime!.split(':').map(Number)
        const aMins = ah * 60 + am
        const bMins = bh * 60 + bm
        const aDiff = aMins - currentMinutes
        const bDiff = bMins - currentMinutes

        const aInWindow = aDiff >= 0 && aDiff <= 10   // 播出前 10 分钟内
        const bInWindow = bDiff >= 0 && bDiff <= 10

        if (aInWindow && bInWindow) return aDiff - bDiff     // 都进入窗口：谁先播谁排前
        if (aInWindow) return -1                              // a 进入窗口
        if (bInWindow) return 1                               // b 进入窗口

        // 都还没到窗口：未播的排在已播的前面
        if (aDiff >= 0 && bDiff >= 0) return aDiff - bDiff    // 都未播：先播的排前
        if (aDiff >= 0) return -1                             // a 未播 b 已播
        if (bDiff >= 0) return 1                              // b 未播 a 已播

        // 都已经播过 → sortOrder（小在前）→ 热度
        return (a.sortOrder || 0) - (b.sortOrder || 0) || (b.clickCount || 0) - (a.clickCount || 0)
      })
      .slice(0, 10)
  }


  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-8">
      <h1 className="sr-only">晨光曦·分享站 — 追剧日历、资源分享</h1>
      {/* Hero Banner */}
      <HeroBanner banners={banners} dramas={allDramas.map(d => ({
        id: d.id, title: d.title, slug: d.slug,
        totalEpisodes: d.totalEpisodes, currentEpisode: d.currentEpisode,
        manualEpisode: d.manualEpisode, airDays: d.airDays, airTime: d.airTime,
        description: d.description, region: d.region, tags: d.tags,
        isCompleted: d.isCompleted, isOnSchedule: d.isOnSchedule, isNewlyAired: d.isNewlyAired,
        isUpcoming: d.isUpcoming, expectedDate: d.expectedDate, startDate: d.startDate, premiereEpisodes: d.premiereEpisodes,
      }))} />

      {/* 公告栏 */}
      {announcements && (
        <AnnouncementBar content={announcements.content} />
      )}

      {/* 追剧日历 */}
      <WeeklyCalendar schedule={schedule} />

      {/* 最新上线 */}
      {activeLatestDramas.length > 0 && (
        <ScrollReveal delay={0}>
          <section>
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-3 text-center">最新上线</h2>
            <FullRowGrid className="drama-grid">
              {activeLatestDramas.map(d => (
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

      {/* 追剧笔记 */}
      <ArticleSection />

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
