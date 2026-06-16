import Link from 'next/link'

const navButtons = [
  {
    href: '/all',
    label: '全部剧集',
    desc: '探索所有',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    gradient: 'from-amber-400/10 to-orange-400/10 hover:from-amber-400/20 hover:to-orange-400/20',
    border: 'border-amber-300/40 hover:border-amber-400/60',
    iconBg: 'bg-amber-100 text-amber-600',
  },
  {
    href: '/schedule',
    label: '追剧日历',
    desc: '本周排播',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    gradient: 'from-blue-400/10 to-cyan-400/10 hover:from-blue-400/20 hover:to-cyan-400/20',
    border: 'border-blue-300/40 hover:border-blue-400/60',
    iconBg: 'bg-blue-100 text-blue-600',
  },
  {
    href: '/articles',
    label: '追剧笔记',
    desc: '看剧分享',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
    gradient: 'from-rose-400/10 to-pink-400/10 hover:from-rose-400/20 hover:to-pink-400/20',
    border: 'border-rose-300/40 hover:border-rose-400/60',
    iconBg: 'bg-rose-100 text-rose-600',
  },
  {
    href: '/request',
    label: '求资源',
    desc: '告诉我们',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
    gradient: 'from-emerald-400/10 to-green-400/10 hover:from-emerald-400/20 hover:to-green-400/20',
    border: 'border-emerald-300/40 hover:border-emerald-400/60',
    iconBg: 'bg-emerald-100 text-emerald-600',
  },
]

export default function QuickNavButtons() {
  return (
    <div className="hidden md:grid grid-cols-4 gap-3 max-w-[700px] mx-auto">
      {navButtons.map(btn => (
        <Link
          key={btn.href}
          href={btn.href}
          className={`group flex flex-col items-center gap-2 px-4 py-4 rounded-2xl border bg-gradient-to-br ${btn.gradient} ${btn.border} transition-all duration-300 hover:shadow-lg hover:-translate-y-1 active:scale-[0.97]`}
        >
          <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${btn.iconBg} transition-transform duration-300 group-hover:scale-110`}>
            {btn.icon}
          </span>
          <span className="text-sm font-bold text-[var(--text-primary)]">{btn.label}</span>
          <span className="text-[11px] text-[var(--text-muted)] -mt-1">{btn.desc}</span>
        </Link>
      ))}
    </div>
  )
}
