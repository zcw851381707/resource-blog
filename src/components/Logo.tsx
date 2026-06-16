'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'

export default function Logo() {
  const [dark, setDark] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const logoSize = 95 // 两个图统一显示宽度

  // 首页点击 logo → 刷新页面
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault()
      router.refresh()
    }
  }, [pathname, router])

  return (
    <Link href="/" onClick={handleClick} className="flex items-center justify-center overflow-hidden relative shrink-0" style={{ width: logoSize, height: 36 }}>
      {/* 晨 — 亮色模式用 */}
      <Image
        src="/晨.png"
        alt="晨光曦·分享站"
        fill
        sizes={`${logoSize}px`}
        className={`object-contain transition-opacity duration-300 ${dark ? 'opacity-0' : 'opacity-100'}`}
        priority
      />
      {/* logo 黑 — 暗色模式用 */}
      <Image
        src="/logo 黑.png"
        alt="晨光曦·分享站"
        fill
        sizes={`${logoSize}px`}
        className={`object-contain transition-opacity duration-300 ${dark ? 'opacity-100' : 'opacity-0'}`}
        style={dark ? { transform: 'scale(0.78)' } : undefined}
        priority
      />
    </Link>
  )
}
