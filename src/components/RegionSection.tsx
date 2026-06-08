import Link from 'next/link'
import DramaCard from './DramaCard'
import FullRowGrid from './FullRowGrid'

interface DramaData {
  id: string
  title: string
  slug: string
  coverImage?: string | null
  region?: string | null
  isNewlyAired: boolean
  isUpcoming: boolean
  expectedDate?: Date | null
  expectedPrecision?: string | null
  airTime?: string | null
  isCompleted: boolean
  totalEpisodes?: number | null
  currentEpisode?: number | null
  manualEpisode?: number | null
  startDate?: Date | null
  completedAt?: Date | null
  isOnSchedule: boolean
  tags?: string | null
  clickCount: number
}

interface RegionSectionProps {
  title: string
  dramas: DramaData[]
  regionKey: string
}

export default function RegionSection({ title, dramas, regionKey }: RegionSectionProps) {
  if (dramas.length === 0) return null

  return (
    <section className="mb-8">
      <h3 className="text-xl font-extrabold text-[var(--text-primary)] mb-3 text-center">{title}</h3>

      <FullRowGrid className="drama-grid">
        {dramas.slice(0, 10).map(d => (
          <DramaCard key={d.id} drama={d} />
        ))}
      </FullRowGrid>

      {/* 查看更多按钮 */}
      <div className="flex justify-center mt-5">
        <Link
          href={`/all?region=${regionKey}`}
          className="px-10 py-2.5 rounded-full border-2 border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--brand)] hover:border-[var(--brand)] active:scale-95 transition-all duration-200 flex items-center gap-1.5"
        >
          查看更多 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </Link>
      </div>
    </section>
  )
}
