import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { hydrateDramaDisplayFields } from '@/lib/drama-schedule'
import Image from 'next/image'
import Link from 'next/link'
import ShareModalClient from './ShareModalClient'
import LikeButton from './LikeButton'

// IP 日浏览量去重
const viewTracker = new Map<string, number>()
const getViewKey = (ip: string, articleId: string) => `${ip}:${articleId}:${new Date().toISOString().slice(0, 10)}`

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let article = await prisma.article.findFirst({
    where: { slug, isPublished: true },
  })

  if (!article) notFound()

  // 浏览量 +1（同 IP 同一天只计一次）
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
    || headersList.get('x-real-ip')
    || '127.0.0.1'
  const viewKey = getViewKey(ip, article.id)
  if (!viewTracker.has(viewKey)) {
    viewTracker.set(viewKey, Date.now())
    await prisma.article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    })
    article = { ...article, viewCount: article.viewCount + 1 }
  }

  // 解析关联剧集并获取数据
  let relatedDramas: Array<{ id: string; title: string; originalTitle?: string | null; slug: string; coverImage: string | null; isCompleted: boolean; isNewlyAired: boolean; totalEpisodes: number | null }> = []
  if (article.dramaTitle) {
    try {
      const refs = JSON.parse(article.dramaTitle) as { slug: string; title: string }[]
      const slugs = refs.map(r => r.slug)
      relatedDramas = await prisma.drama.findMany({
        where: { slug: { in: slugs } },
        select: { id: true, title: true, slug: true, coverImage: true, isCompleted: true, isNewlyAired: true, totalEpisodes: true },
      })
      await hydrateDramaDisplayFields(relatedDramas as Array<{ id: string } & Record<string, unknown>>)
    } catch { /* ignore */ }
  }

  const timeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}天前`
    return date.toISOString().slice(0, 10)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
      {/* 封面图 */}
      {article.coverImage && (
        <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-[var(--bg-secondary)] mb-8">
          <Image src={article.coverImage} alt={article.title} fill className="object-cover" sizes="100vw" priority
            style={{ objectPosition: (article as any).imagePosition || 'center' }} />
        </div>
      )}

      {/* 标题 */}
      <h1 className="text-xl md:text-3xl font-extrabold text-[var(--text-primary)] leading-snug tracking-tight">{article.title}</h1>

      {/* 元信息栏：发布时间 + 浏览量，靠右 */}
      <div className="flex items-center justify-end gap-4 mt-3 mb-6 text-sm text-[var(--text-muted)]">
        <span>发布时间：{article.publishedAt ? timeAgo(article.publishedAt) : ''}</span>
        <span>浏览量：{article.viewCount.toLocaleString()}</span>
      </div>

      <div className="border-t border-[var(--border)]" />

      {/* 正文 */}
      <div
        className="prose max-w-none text-[var(--text-primary)]
          px-1 md:px-0
          [&_p]:text-[15px] [&_p]:leading-7 [&_p]:my-5 [&_p]:tracking-[0.01em] [&_p:empty]:h-4 [&_p:empty]:block
          [&_img]:rounded-xl [&_img]:max-w-full [&_img]:my-8
          [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-5 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-[var(--border)]
          [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-4
          [&_a]:text-[var(--brand)] [&_a]:underline
          [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--brand)] [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:my-6 [&_blockquote]:text-[var(--text-muted)] [&_blockquote]:italic
          [&_ul]:my-5 [&_ol]:my-5 [&_li]:my-2
          [&_hr]:my-10 [&_hr]:border-[var(--border)]
          [&_figure]:my-8 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-[var(--text-muted)] [&_figcaption]:mt-3
          [&_.wp-caption]:max-w-full
          mt-8"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      <div className="my-8 border-t border-[var(--border)]" />

      {/* 点赞：文章底部 */}
      <div className="flex items-center justify-center py-6">
        <LikeButton articleId={article.id} initialLikes={article.likes} />
      </div>

      <div className="border-t border-[var(--border)]" />

      {/* 原文链接 + 分享 */}
      <div className="flex items-center justify-between flex-wrap gap-3 mt-6">
        {article.wechatUrl ? (
          <a href={article.wechatUrl} target="_blank" rel="noopener noreferrer"
            className="text-sm text-[var(--brand)] hover:underline flex items-center gap-1">
            查看公众号原文 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        ) : <span />}
        <ShareModalClient title={article.title} slug={article.slug} />
      </div>

      {/* 关联剧集 */}
      {relatedDramas.length > 0 && (
        <div className="mt-8">
          <p className="text-lg font-bold text-[var(--text-primary)] mb-3">📺 文中提到的剧集</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {relatedDramas.map(d => (
              <Link key={d.id} href={`/drama/${d.slug}`}
                className="group block rounded-xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="relative aspect-[2/3] bg-[var(--bg-secondary)]">
                  {d.coverImage ? (
                    <Image src={d.coverImage} alt={d.title} fill className="object-cover" sizes="25vw" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs">暂无封面</div>
                  )}
                  {d.isCompleted && (
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-500/90 text-white">已完结</span>
                  )}
                  {d.isNewlyAired && !d.isCompleted && (
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-500/90 text-white">新播</span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1 group-hover:text-[var(--brand)] transition-colors">{d.title || d.originalTitle}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {d.totalEpisodes ? `共${d.totalEpisodes}集` : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 返回 */}
      <div className="mt-8 text-center">
        <Link href="/articles" className="text-sm text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors">
          ← 返回笔记列表
        </Link>
      </div>
    </div>
  )
}
