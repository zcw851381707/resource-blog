import type { Metadata, Viewport } from "next";
import "./globals.css";
import VisitTracker from "@/components/VisitTracker";
import { SiteHeader, SiteFooter, SiteMobileNav } from "@/components/SiteChrome";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: "晨光曦·分享站",
  description: "精选资源分享，每日更新",
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
      </head>
      <body className="min-h-full flex flex-col">
        <VisitTracker />
        <SiteHeader />
        <main className="flex-1 pb-2 md:pb-0">{children}</main>
        <SiteMobileNav />
        <SiteFooter />
      </body>
    </html>
  );
}
