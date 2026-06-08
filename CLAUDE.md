# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 项目概况

这是一个中国地区电视剧/资源分享官网 (晨光曦·分享站)。面向 20-35 岁、一二线城市、83% 女性用户群体。核心功能：追剧日历、剧集自动更新、首播过渡、飞书推送。

## 技术栈

- **框架**: Next.js 16.2 (App Router + Turbopack)
- **数据库**: SQLite (Prisma 5.22)
- **样式**: Tailwind CSS v4 (`@import "tailwindcss"`)
- **认证**: jose JWT + bcryptjs
- **React**: 19.2 (StrictMode 已关闭)

## 常用命令

```bash
npm run dev          # 启动开发服务器 (localhost:3000)
npm run build        # 构建
npm run lint         # ESLint
npx tsx scripts/update-episodes.ts   # 手动执行剧集自动更新
npx tsx prisma/seed.ts               # 数据库初始化
npx prisma generate  # 重新生成 Prisma Client (ALTER TABLE 后必须执行)
```

## 核心架构

### 数据流

页面采用服务端组件 (Server Components) 直连 Prisma。admin API 使用 Prisma Client 做主要 CRUD，部分后期添加的列（videoUrl, seriesGroup, pausedDays, isSuspended, imagePosition, originalTitle）通过原始 SQL 读写。

### airDays 映射

`0=周一, 1=周二, 2=周三, 3=周四, 4=周五, 5=周六, 6=周日`

`new Date().getDay()` 转换规则：`d === 0 ? 6 : d - 1`

### 剧集状态体系

| 字段 | 用途 |
|------|------|
| `isUpcoming` | 即将上线（显示在"即将上线"区域） |
| `isNewlyAired` | 最新上线（自动更新脚本完成首播过渡时设置） |
| `isOnSchedule` | 在追剧中（出现在追剧日历里） |
| `isCompleted` | 已完结 |
| `isSuspended` | 暂缓播出（日历显示"另行通知"，自动更新跳过） |
| `pausedDays` | 本周停播日（逗号分隔的 dayIndex，日历显示"停播"标签，自动更新跳过） |

### 集数计算

`manualEpisode` 优先，否则 `currentEpisode`。自动更新脚本按 `currentEpisode + episodesPerDay` 递增，同日不重复。

### 首播自动过渡

`update-episodes.ts` 检测 `isUpcoming` 且 `expectedDate` 已过且 `airTime` 已过的剧，自动设置 `isUpcoming=false, isNewlyAired=true, isOnSchedule=true`(如有 airDays)。

### 午夜剧处理

去除 `isEarlyMorning` 逻辑，直接用 `todayKey` 匹配 `airDays`。23:30 之后的剧通过补更机制次日补偿。

### 追剧日历排序

停播剧排最后 → 置顶10分钟内播出的 → 未播+播完30分内保持原位置 → 播完超30分移到末尾 → 全部播完超30分钟后恢复正常时间排序。

### 认证

`/api/auth/*` 基于 jose JWT。管理后台 (`/admin`) 受密码保护。`requireAuth()` 中间件检查 token。

### 关键文件

| 文件 | 说明 |
|------|------|
| `src/app/page.tsx` | 首页 (SSR) |
| `src/components/WeeklyCalendar.tsx` | 追剧日历 + 排序 + 海报生成 |
| `src/components/HorizontalSlider.tsx` | 即将上线横向滑动 |
| `src/components/DramaCard.tsx` | 剧集卡片 |
| `src/app/admin/drama/page.tsx` | 影视管理后台 |
| `scripts/update-episodes.ts` | 剧集自动更新 + 首播过渡 |
| `prisma/schema.prisma` | 数据模型 |

### 飞书推送

`lark-cli im +messages-send --as bot --user-id ou_9c5bde1093bb93ee99ae4c528cb90aa2 --text '...'`。所有推送全自动，不需要用户确认。

### Tailwind CSS v4 注意事项

`bg-[var(--brand)]` 等 CSS 变量语法在 Tailwind v4 中可能不可靠，必要时使用 inline `style={{}}` 代替。
