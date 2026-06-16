'use client'

import { useState } from 'react'

export default function AnnouncementBar({ content }: { content: string }) {
  const [exiting, setExiting] = useState(false)
  const [gone, setGone] = useState(false)

  const handleClose = () => setExiting(true)

  if (gone) return null

  return (
    <div
      className={`relative bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-3 overflow-hidden ${exiting ? 'animate-collapseOut' : ''}`}
      onAnimationEnd={() => { if (exiting) setGone(true) }}
    >
      <span className="text-amber-500 text-lg shrink-0">⚡</span>
      <div className="flex-1 overflow-hidden">
        {/* 移动端：单条，自动换行；PC端：双条跑马灯 */}
        <p className="text-sm text-amber-800 md:whitespace-nowrap animate-marquee">
          <span className="md:hidden">{content}</span>
          <span className="hidden md:inline">{content}</span>
          <span className="mx-80 hidden md:inline">{content}</span>
        </p>
      </div>
      <button
        onClick={handleClose}
        className="text-amber-400 hover:text-amber-600 active:scale-90 transition-all shrink-0 ml-2"
        title="关闭公告"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
