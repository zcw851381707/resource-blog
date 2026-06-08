export default function HomeSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-8">
      {/* Banner 占位 */}
      <div className="skeleton rounded-2xl aspect-[2/1] md:aspect-[6/2]" />

      {/* 公告栏占位 */}
      <div className="skeleton h-10 rounded-lg" />

      {/* 追剧日历占位 */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex border-b border-[var(--border)] last:border-b-0">
            <div className="w-16 md:w-20 shrink-0 flex flex-col items-center justify-center py-3 gap-1">
              <div className="h-3 w-8 skeleton rounded" />
              <div className="h-2 w-6 skeleton rounded" />
            </div>
            <div className="flex-1 p-3">
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="w-40 h-16 skeleton rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 卡片网格占位 ×4 */}
      {Array.from({ length: 4 }).map((_, i) => (
        <section key={i}>
          <div className="skeleton h-7 w-20 mx-auto mb-3 rounded" />
          <div className="drama-grid">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="skeleton aspect-[2/3] rounded-lg" />
            ))}
          </div>
        </section>
      ))}

      {/* 关注我占位 */}
      <section>
        <div className="skeleton h-7 w-16 mx-auto mb-3 rounded" />
        <div className="skeleton h-24 rounded-xl" />
      </section>
    </div>
  )
}
