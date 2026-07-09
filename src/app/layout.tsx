import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientShell from "@/components/ClientShell";

export const runtime = 'nodejs';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: {
    default: '晨光曦·分享站 — 追剧日历、资源分享',
    template: '%s — 晨光曦·分享站',
  },
  description: '最新电视剧资源一站式导航。追剧日历、网盘资源、剧集推荐，每日更新热门泰剧韩剧日剧国产剧。',
  keywords: ['追剧', '日历', '资源', '泰剧', '韩剧', '日剧', '国产剧', '网盘', '下载', '晨光曦'],
  authors: [{ name: '晨光曦·分享站' }],
  robots: { index: false, follow: false },
  openGraph: {
    title: '晨光曦·分享站 — 追剧日历、资源分享',
    description: '最新电视剧资源一站式导航。追剧日历、网盘资源、剧集推荐，每日更新。',
    siteName: '晨光曦·分享站',
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '晨光曦·分享站',
    description: '追剧日历、资源分享，每日更新',
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/晨-网站.png", sizes: "638x637", type: "image/png" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}})()`,
          }}
        />
        {/* bfcache 恢复时强制刷新，解决事件委托失效 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('pageshow',function(e){if(e.persisted)window.location.reload()})`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* JSON-LD 结构化数据 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: '晨光曦·分享站',
              url: 'https://www.chenguangxi.com',
              description: '最新电视剧资源一站式导航。追剧日历、网盘资源、剧集推荐。',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://www.chenguangxi.com/search?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
