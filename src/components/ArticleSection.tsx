import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import ScrollReveal from './ScrollReveal'
import ArticleCarousel from './ArticleCarousel'

export default async function ArticleSection() {
  const articles = await prisma.article.findMany({
    where: { isPublished: true },
    orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
    take: 5,
  })

  if (articles.length === 0) return null

  const mapped = articles.map(a => ({ id: a.id, title: a.title, slug: a.slug, coverImage: a.coverImage, publishedAt: a.publishedAt }))

  return (
    <ScrollReveal delay={50}>
      <section>
        <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-4 text-center">追剧笔记</h2>

        {/* PC：Carousel（不做改动）*/}
        <div className="hidden md:block">
          <ArticleCarousel articles={mapped} />
        </div>

        {/* 移动端：首篇文章全宽 + 其余两列网格 */}
        <div className="md:hidden space-y-3">
          {/* 最新文章 - 全宽卡片 */}
          {mapped[0] && (
            <Link
              key={mapped[0].id}
              href={'/articles/' + mapped[0].slug}
              className="block rounded-xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="aspect-[16/9] bg-[var(--bg-secondary)] relative overflow-hidden">
                {mapped[0].coverImage ? (
                  <img src={mapped[0].coverImage} alt={mapped[0].title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs">暂无封面</div>
                )}
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[var(--brand)] text-white text-[10px] font-semibold shadow-sm">最新</span>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug">{mapped[0].title}</h3>
                {mapped[0].publishedAt && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">{new Date(mapped[0].publishedAt).toLocaleDateString('zh-CN')}</p>
                )}
              </div>
            </Link>
          )}

          {/* 其余文章 - 两列网格 */}
          {mapped.slice(1).length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {mapped.slice(1).map(article => (
                <Link
                  key={article.id}
                  href={'/articles/' + article.slug}
                  className="rounded-xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[16/9] bg-[var(--bg-secondary)] relative overflow-hidden">
                    {article.coverImage ? (
                      <img src={article.coverImage} alt={article.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs">暂无封面</div>
                    )}
                  </div>
                  <div className="p-2">
                    <h3 className="text-xs font-bold text-[var(--text-primary)] line-clamp-2 leading-snug">{article.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 查看更多 */}
        <div className="flex justify-center mt-5 md:mt-5">
          <Link href="/articles" className="px-10 py-2.5 rounded-full border-2 border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--brand)] hover:border-[var(--brand)] transition-all duration-200 flex items-center gap-1.5">
            查看更多笔记 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </section>
    </ScrollReveal>
  )
}
