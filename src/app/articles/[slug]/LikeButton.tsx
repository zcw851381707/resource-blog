'use client'

import { useState, useCallback, useRef } from 'react'

export default function LikeButton({ articleId, initialLikes }: { articleId: string; initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes)
  const [liked, setLiked] = useState(false)
  const [animating, setAnimating] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  const handleLike = useCallback(async () => {
    if (liked) return
    setLiked(true)
    setLikes(prev => prev + 1)
    setAnimating(true)

    // 弹出爱心粒子
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top
      for (let i = 0; i < 8; i++) {
        const heart = document.createElement('span')
        heart.textContent = ['❤️', '💕', '💗', '💖', '✨'][i % 5]
        heart.style.cssText = `
          position:fixed; left:${cx}px; top:${cy}px; font-size:${16 + Math.random() * 14}px;
          pointer-events:none; z-index:9999;
          transition: all ${0.6 + Math.random() * 0.4}s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        `
        document.body.appendChild(heart)
        requestAnimationFrame(() => {
          heart.style.transform = `translate(${(Math.random() - 0.5) * 120}px, ${-60 - Math.random() * 80}px) scale(0)`
          heart.style.opacity = '0'
        })
        setTimeout(() => heart.remove(), 1200)
      }
    }
    setTimeout(() => setAnimating(false), 600)

    try {
      await fetch(`/api/articles/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like' }),
      })
    } catch {
      setLiked(false)
      setLikes(prev => prev - 1)
    }
  }, [articleId, liked])

  return (
    <button
      ref={btnRef}
      onClick={handleLike}
      disabled={liked}
      className={`group flex flex-col items-center gap-1 transition-all duration-300 ${
        liked ? 'scale-110' : 'hover:scale-105 active:scale-95'
      } ${animating ? 'animate-bounce' : ''}`}
    >
      <img
        src={liked ? '/like-on.svg' : '/like-off.svg'}
        alt={liked ? '已点赞' : '点赞'}
        className={`w-12 h-12 transition-all duration-300 ${liked ? 'drop-shadow-lg' : 'opacity-60 group-hover:opacity-100'}`}
      />
      <span className={`text-sm font-semibold transition-colors ${liked ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
        {likes > 0 ? likes : '点赞'}
      </span>
    </button>
  )
}
