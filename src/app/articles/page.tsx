import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import Link from 'next/link'

export const metadata = { title: '追剧笔记 - 晨光曦·分享站' }

export default async function ArticlesPage() {
  const articles = await prisma.article.findMany({
    where: { isPublished: true },
    orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">追剧笔记</h1>

      {articles.length === 0 ? (
        <p className="text-[var(--text-muted)] text-center py-16">暂无文章</p>
      ) : (
        <div className="space-y-4">
          {articles.map((a, i) => (
            <Link key={a.id} href={`/articles/${a.slug}`}
              className="flex gap-4 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="relative w-[120px] h-[80px] md:w-[160px] md:h-[100px] rounded-lg overflow-hidden bg-[var(--bg-secondary)] shrink-0">
                {a.coverImage ? (
                  <Image src={a.coverImage} alt={a.title} fill className="object-cover" sizes="160px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs">暂无封面</div>
                )}
                {i === 0 && <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-[var(--brand)] text-white text-[10px] font-semibold">最新</span>}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h2 className="text-base md:text-lg font-bold text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--brand)] transition-colors">
                  {a.pinned && <span className="mr-1.5 text-red-500" title="置顶">📌</span>}{a.title}
                </h2>
                {a.excerpt && <p className="text-sm text-[var(--text-muted)] mt-1.5 line-clamp-2 hidden md:block">{a.excerpt}</p>}
                <p className="text-xs text-[var(--text-muted)] mt-2">{a.publishedAt?.toISOString().slice(0, 10)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
