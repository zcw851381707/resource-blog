// 直接看 SSR 输出是否包含客户端导航菜单 (SiteHeader)
// SiteHeader 是 client component，SSR 时不会渲染登录按钮 - 这是正常的
// 但 SiteChrome 中也有 server 部分？让我看一下
import { readFile } from 'fs/promises'
const notifPage = await readFile('src/app/notifications/page.tsx', 'utf-8')
console.log('Notifications page 是 client 吗:', notifPage.includes("'use client'"))
const detail = await readFile('src/app/drama/[slug]/page.tsx', 'utf-8')
console.log('Detail page 是 server 吗:', detail.startsWith("import"))
