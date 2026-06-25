import Image from 'next/image'
import Link from 'next/link'

interface Drama {
  id: string
  title: string
  originalTitle?: string | null
  slug: string
  coverImage?: string | null
  description?: string | null
}

interface DramaBannerProps {
  dramas: Drama[]
}

export default function DramaBanner({ dramas }: DramaBannerProps) {
  if (dramas.length === 0) return null

  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-gray-900 mb-4">热播剧</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {dramas.map((drama) => (
          <Link
            key={drama.id}
            href={`/drama/${drama.slug}`}
            className="group"
          >
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 shadow-sm">
              {drama.coverImage ? (
                <Image
                  src={drama.coverImage}
                  alt={drama.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  暂无封面
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="text-white text-sm font-medium line-clamp-1">{drama.title || drama.originalTitle}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
