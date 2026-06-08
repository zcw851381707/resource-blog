'use client'

import { useEffect, useRef } from 'react'

export default function ScrollReveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const isDesktop = window.innerWidth >= 640
    const rect = el.getBoundingClientRect()
    const isAboveFold = rect.top < window.innerHeight + 40

    // 桌面端：首屏内容自动延迟渐入；移动端：全部等滑动到才出现
    if (isDesktop && isAboveFold) {
      const timer = setTimeout(() => {
        el.classList.add('revealed')
      }, delay)
      return () => clearTimeout(timer)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed')
          observer.unobserve(el)
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px -40px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div ref={ref} className={`section-reveal ${className}`}>
      {children}
    </div>
  )
}
