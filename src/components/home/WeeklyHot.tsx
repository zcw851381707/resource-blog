'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Item {
  rank: number
  id: string
  title: string
  slug: string
  coverImage: string | null
  clickCount: number
  totalFollowings: number
  totalFavorites: number
}

const RANK_THEMES = [
  { text: '#F59E0B' },
  { text: '#06B6D4' },
  { text: '#F97316' },
]

export default function WeeklyHot() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const [tags, setTags] = useState<Record<string, string[]>>({})

  useEffect(() => {
    let cancelled = false
    fetch('/api/home/weekly-hot')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        setItems(data.items || [])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // 加载榜单标签
  useEffect(() => {
    fetch('/api/home/ranking-tags')
      .then(r => r.json())
      .then(data => { if (data.tags) setTags(data.tags) })
      .catch(() => {})
  }, [])

  if (loading) return null
  if (items.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-center gap-2 mb-4">
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M12 2c1 3 4 4.5 4 7.5a4 4 0 0 1-8 0c0-1.5.5-2.5 1.5-3.5" />
          <path d="M12 22a7 7 0 0 0 7-7c0-2-1-4-3-5.5" />
        </svg>
        <h2 className="text-xl font-extrabold text-[var(--text-primary)]">热播追剧榜</h2>
      <span className="text-[10px] text-[var(--text-muted)]">每小时更新</span>
      </div>

      {/* 桌面端：卡片网格 */}
      <div className="hidden md:grid md:grid-cols-5 gap-3">
        {items.map((item, idx) => (
          <Link key={item.id} href={`/drama/${item.slug}`} className="group">
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[var(--bg-secondary)] shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200">
              {item.coverImage ? (
                <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)]">暂无封面</div>
              )}
              <span
                className="absolute font-black italic leading-none pointer-events-none select-none"
                style={{
                  fontSize: '6rem', bottom: '2.6rem', left: '0.4rem', fontStyle: 'italic',
                  color: idx < 3 ? RANK_THEMES[idx].text : 'rgba(255,255,255,0.7)',
                  WebkitTextStroke: '1px rgba(255,255,255,0.4)',
                  WebkitTextFillColor: idx < 3 ? RANK_THEMES[idx].text : 'rgba(255,255,255,0.55)',
                  paintOrder: 'stroke fill', filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.7))', zIndex: 2,
                }}
              >{item.rank}</span>
              <div className="absolute top-2 right-2 z-10">
                <span className="px-3 py-1.5 rounded-lg bg-black/70 text-white text-sm font-bold flex items-center gap-1.5 backdrop-blur-sm shadow-lg">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#FB923C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2c1 3 4 4.5 4 7.5a4 4 0 0 1-8 0c0-1.5.5-2.5 1.5-3.5C9 8 8 9.5 8 11"/>
                    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-4-3-5.5"/>
                  </svg>
                  {item.clickCount.toLocaleString()}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-6 pb-2 px-2.5 z-10">
                {tags[item.id] && tags[item.id].length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {tags[item.id].slice(0, 2).map((tag, ti) => (
                    <span key={ti} className="text-[10px] text-white font-medium drop-shadow">{tag}</span>
                  ))}
                </div>
              )}
              <p className="text-[13px] font-bold text-white line-clamp-2 leading-tight drop-shadow">{item.title}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 手机端：竖屏排行榜列表 */}
      <div className="md:hidden divide-y divide-[var(--border)]">
        {items.map((item, idx) => (
          <Link key={item.id} href={"/drama/" + item.slug} className="block px-1 py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-7 text-center">
                <span className={"font-black text-base " + (idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-cyan-500' : idx === 2 ? 'text-orange-500' : 'text-[var(--text-muted)] text-sm')}>
                  {idx === 0 ? '1' : idx === 1 ? '2' : idx === 2 ? '3' : item.rank}
                </span>
              </div>
              <div className="shrink-0 w-10 h-14 rounded-md overflow-hidden bg-[var(--bg-secondary)]">
                {item.coverImage ? <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] text-[var(--text-muted)]">无图</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.title}</p>
                  {tags[item.id] && tags[item.id].length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {tags[item.id].slice(0, 2).map((tag, ti) => (
                        <span key={ti} className={"text-[11px] font-medium px-1.5 py-0.5 rounded border " + (tag.includes("蝉联") ? "text-amber-600 border-amber-300" : tag.includes("稳居") ? "text-cyan-600 border-cyan-300" : "text-emerald-600 border-emerald-300")}>{tag}</span>
                      ))}
                    </div>
                  )}
              </div>
              <div className="shrink-0 flex items-center gap-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#FB923C" strokeWidth="2"><path d="M12 2c1 3 4 4.5 4 7.5a4 4 0 0 1-8 0c0-1.5.5-2.5 1.5-3.5C9 8 8 9.5 8 11"/><path d="M12 22a7 7 0 0 0 7-7c0-2-1-4-3-5.5"/></svg>
                <span className="text-sm font-bold text-[var(--text-primary)]">{item.clickCount.toLocaleString()}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>    </section>
  )
}
