'use client'

import { useState } from 'react'
import Image from 'next/image'

interface SocialLinkData {
  id: string
  name: string
  icon: string
  url?: string | null
  qrCode?: string | null
}

const iconColors: Record<string, string> = {
  WB: '#E6162D',
  DY: '#161823',
  BL: '#00A1D6',
  XHS: '#FE2C55',
  WX: '#07C160',
}

export default function SocialSection({ socials }: { socials: SocialLinkData[] }) {
  const [qrModal, setQrModal] = useState<SocialLinkData | null>(null)

  if (socials.length === 0) return null

  return (
    <section>
      <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-4 text-center">关注我</h2>
      <div className="flex flex-wrap justify-center gap-4 md:gap-8">
        {socials.map((s) => {
          const isImg = s.icon && (s.icon.startsWith('/uploads/') || s.icon.startsWith('/api/uploads/') || s.icon.startsWith('http'))
          const color = iconColors[s.icon] || '#666'
          const content = (
            <div className="flex flex-col items-center gap-1.5">
              {isImg ? (
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center p-2.5">
                  <img src={s.icon} alt={s.name} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-sm font-bold shadow-sm"
                  style={{ backgroundColor: color }}
                >
                  {s.icon}
                </div>
              )}
              <span className="text-[11px] text-[var(--text-muted)]">{s.name}</span>
            </div>
          )

          if (s.url) {
            return (
              <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="hover:scale-105 active:scale-95 transition-transform">
                {content}
              </a>
            )
          }
          if (s.qrCode) {
            return (
              <button key={s.id} onClick={() => setQrModal(s)} className="hover:scale-105 active:scale-95 transition-transform cursor-pointer">
                {content}
              </button>
            )
          }
          return <div key={s.id}>{content}</div>
        })}
      </div>

      {/* 二维码弹窗 */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setQrModal(null)}>
          <div className="bg-[var(--bg-card)] rounded-2xl p-6 md:p-8 shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <p className="text-base md:text-lg font-semibold text-[var(--text-primary)] text-center mb-4 md:mb-6">扫码关注 {qrModal.name}</p>
            <div className="w-64 h-64 md:w-80 md:h-80 mx-auto">
              <Image src={qrModal.qrCode!} alt={qrModal.name} width={320} height={320} className="rounded-xl w-full h-full object-contain" />
            </div>
            <button onClick={() => setQrModal(null)} className="mt-5 md:mt-6 w-full py-2.5 md:py-3 rounded-xl bg-[var(--bg-secondary)] text-sm md:text-base text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors">
              关闭
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
