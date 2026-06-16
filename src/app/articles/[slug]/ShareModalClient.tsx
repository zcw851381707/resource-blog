'use client'

import { useState } from 'react'

export default function ShareModalClient({ title, slug }: { title: string; slug: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const url = `${window.location.origin}/articles/${slug}`
    try {
      await navigator.clipboard.writeText(`${title}\n${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = `${title}\n${url}`
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button onClick={handleCopy}
      className={`text-sm font-medium transition-colors ${copied ? 'text-green-500' : 'text-[var(--text-secondary)] hover:text-[var(--brand)]'}`}>
      {copied ? '已复制链接' : '📋 复制分享'}
    </button>
  )
}
