import Image from 'next/image'
import Link from 'next/link'

interface Drama {
  id: string
  title: string
  originalTitle?: string | null
  slug: string
  coverImage?: string | null
  airTime?: string | null
}

interface WeeklyScheduleProps {
  schedule: Record<number, Drama[]>
}

const dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']

export default function WeeklySchedule({ schedule }: WeeklyScheduleProps) {
  const hasAnyDrama = Object.values(schedule).some(d => d.length > 0)
  if (!hasAnyDrama) return null

  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-gray-900 mb-4">每周排期</h2>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const dramas = schedule[day] || []
          if (dramas.length === 0) return null
          return (
            <div key={day} className="flex border-b last:border-b-0">
              <div className="w-16 md:w-20 shrink-0 bg-gray-50 flex items-center justify-center font-medium text-gray-700 text-sm border-r">
                {dayNames[day]}
              </div>
              <div className="flex-1 flex flex-wrap gap-3 p-3">
                {dramas.map((drama) => (
                  <Link
                    key={drama.id}
                    href={`/drama/${drama.slug}`}
                    className="flex items-center gap-2 hover:bg-gray-50 rounded-lg p-1.5 transition-colors"
                  >
                    <div className="w-10 h-14 relative rounded overflow-hidden bg-gray-200 shrink-0">
                      {drama.coverImage ? (
                        <Image src={drama.coverImage} alt={drama.title} fill className="object-cover" />
                      ) : null}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{drama.title || drama.originalTitle}</p>
                      {drama.airTime && (
                        <p className="text-xs text-gray-400">{drama.airTime}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
