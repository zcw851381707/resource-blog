'use client'

import { useRef, useState, useLayoutEffect, ReactElement } from 'react'

/**
 * 自适应网格，自动隐藏不完整的最后一行
 * 读取浏览器计算出的实际列数，只保留完整行的项目
 */
export default function FullRowGrid({ children, className }: { children: ReactElement[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(0)
  const childArray = Array.isArray(children) ? children : [children]
  const total = childArray.length

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      const style = getComputedStyle(el)
      const templates = style.gridTemplateColumns
      if (!templates || templates === 'none') return
      setCols(templates.trim().split(/\s+/).length)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el.parentElement!)
    return () => ro.disconnect()
  }, [])

  // 不够一排，全部不展示
  if (cols > 0 && total < cols) return null

  const fullRows = cols > 0 ? Math.floor(total / cols) * cols : total

  return (
    <div ref={ref} className={className}>
      {cols > 0 ? childArray.slice(0, fullRows) : childArray}
    </div>
  )
}
