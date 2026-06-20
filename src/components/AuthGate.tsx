'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import AuthModal from './AuthModal'

const BUBBLES = [
  { size: 95, left: 18, duration: 18, delay: 0, anim: 'floatBubble' },
  { size: 110, left: 75, duration: 22, delay: -8, anim: 'floatBubbleAlt' },
  { size: 48, left: 30, duration: 14, delay: -2, anim: 'floatBubbleAlt' },
  { size: 55, left: 60, duration: 16, delay: -5, anim: 'floatBubble' },
  { size: 42, left: 85, duration: 15, delay: -10, anim: 'floatBubbleAlt' },
  { size: 50, left: 8, duration: 17, delay: -3, anim: 'floatBubble' },
  { size: 22, left: 12, duration: 12, delay: -1, anim: 'floatBubble' },
  { size: 28, left: 35, duration: 13, delay: -4, anim: 'floatBubbleAlt' },
  { size: 24, left: 50, duration: 14, delay: -7, anim: 'floatBubble' },
  { size: 30, left: 65, duration: 12, delay: -9, anim: 'floatBubbleAlt' },
  { size: 26, left: 80, duration: 15, delay: -6, anim: 'floatBubble' },
  { size: 20, left: 42, duration: 11, delay: -2, anim: 'floatBubbleAlt' },
  { size: 32, left: 92, duration: 14, delay: -11, anim: 'floatBubble' },
  { size: 24, left: 22, duration: 13, delay: -5, anim: 'floatBubbleAlt' },
]

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const [authPage, setAuthPage] = useState<'login' | 'register' | null>(null)

  return (
    <>
      {/* loading 阶段不展示内容，也不展示登录遮罩 */}
      {loading ? (
        <div className="fixed inset-0 z-[300] bg-white flex items-center justify-center">
          <img src="/刷新页面中.png" alt="加载中" className="w-64 h-64 md:w-80 md:h-80 object-contain scale-[3]" />
        </div>
      ) : user ? (
        children
      ) : (
        <>
          <div style={{ filter: 'blur(20px)', pointerEvents: 'none' }}>{children}</div>
          <div className="fixed inset-0 z-[250] overflow-hidden flex flex-col items-center justify-center px-4 gap-6 bg-gradient-to-b from-[#FFF5F5] to-[#FFEAEA]">
            <div className="pointer-events-none absolute -top-[100px] -left-[100px] w-[320px] h-[320px] rounded-full" style={{ background: 'rgba(232,160,164,0.1)' }} />
            <div className="pointer-events-none absolute -bottom-[150px] -right-[150px] w-[380px] h-[380px] rounded-full" style={{ background: 'rgba(232,160,164,0.08)' }} />
            {BUBBLES.map((b, i) => (
              <div key={i} className="pointer-events-none absolute" style={{ width: b.size, height: b.size, left: `${b.left}%`, borderRadius: '50%', animation: `${b.anim} ${b.duration}s linear ${b.delay}s infinite`, background: 'radial-gradient(circle at 28% 25%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.4) 18%, rgba(255,255,255,0.1) 38%, rgba(255,255,255,0.02) 65%, transparent 80%), radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 0%, transparent 70%)', boxShadow: 'inset 2px 3px 8px rgba(255,255,255,0.9), inset -2px -3px 6px rgba(232,160,164,0.18), inset 0 0 18px rgba(255,255,255,0.4), 0 6px 24px rgba(232,160,164,0.12), 0 0 0 1px rgba(255,255,255,0.5)', zIndex: 0 }} />
            ))}
            <div className="relative z-10 w-28 h-28 rounded-full overflow-hidden">
              <img src="/晨-方全红.png" alt="晨光曦" className="w-full h-full object-cover" />
            </div>
            <h1 className="relative z-10 text-2xl font-extrabold tracking-widest" style={{ color: '#1a1a1a' }}>晨光曦 · 分享站</h1>
            <p className="relative z-10 text-sm text-[var(--text-muted)] tracking-[8px]">影 视 · 分 享 · 资 源</p>
            <div className="relative z-10 flex flex-col gap-3 mt-8">
              <button onClick={() => setAuthPage('login')} className="w-64 h-12 rounded-full bg-[var(--brand)] text-white font-semibold text-sm tracking-[4px] hover:opacity-90 transition-opacity shadow-lg shadow-[var(--brand)]/25">登 录</button>
              <button onClick={() => setAuthPage('register')} className="w-64 h-12 rounded-full border-2 border-[var(--brand)] bg-transparent text-[var(--brand)] font-semibold text-sm tracking-[4px] hover:bg-[var(--brand-pale)] transition-colors">注 册</button>
            </div>
            <p className="relative z-10 text-xs text-[var(--text-muted)] mt-4">当前是内测阶段 · 注册需要邀请码</p>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes floatBubble {
          0%   { transform: translate(0, 100vh) scale(0.5); opacity: 0; }
          8%   { opacity: 1; }
          50%  { transform: translate(60px, 50vh) scale(1); }
          92%  { opacity: 1; }
          100% { transform: translate(-50px, -100px) scale(0.7); opacity: 0; }
        }
        @keyframes floatBubbleAlt {
          0%   { transform: translate(0, 100vh) scale(0.4); opacity: 0; }
          8%   { opacity: 0.95; }
          50%  { transform: translate(-80px, 50vh) scale(0.95); }
          92%  { opacity: 0.95; }
          100% { transform: translate(60px, -100px) scale(0.6); opacity: 0; }
        }
      `}</style>

      <AuthModal show={!!authPage} initialPage={authPage || 'login'} onClose={() => setAuthPage(null)} />
    </>
  )
}
