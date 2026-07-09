# 晨光曦·分享站 — AI 交接文档

> 任何接手本项目的 AI，读完本文即可上手，**无需问用户任何基础问题**。

---

## 一、一句话定位

**晨光曦·分享站** = 追剧日历 + 资源分享站。用户在这里看每周追剧排期、找网盘资源、追更、评分评论。

- 线上地址：https://cgx851.com
- 项目名：resource-blog

---

## 【最高优先级规则】禁止自动部署 🚫

> 网站已正式推向大众，**用户正在实时使用**。任何部署操作都会打断用户访问。

### 铁律

1. **所有代码修改只允许在本地**（`/Volumes/SamsungX5/Claude code/resource-blog/src/`）
2. **严禁** 执行 `rsync`、`scp`、`ssh ... npm run build`、`pm2 restart` 等任何部署命令
3. **严禁** 修改服务器上的任何文件
4. 如果用户要求部署，**不要自行执行**——告知用户：「代码已改好在本机，需要部署时告诉我，我整理好所有改动后统一推送」

### 正确的工作方式

| 用户说什么 | AI 应该做什么 |
|---|---|
| "修复这个 bug" | 改本地代码 → 告知用户「改好了，在本机，要部署吗？」 |
| "加个新功能" | 改本地代码 → 同上 |
| "部署吧" | **只在用户明确说部署时**，才可以 rsync → build → restart |

### 部署时机

部署由用户决定，通常选择**用户活跃度低的时段**（如深夜或凌晨）。

### 本地验证

改完代码后，可以用 `npm run dev` 在本地验证效果（`http://localhost:3000`），但这不会影响线上用户。

---

## 二、项目位置

```
/Volumes/SamsungX5/Claude code/resource-blog/
```

本地 Dev：`npm run dev` → http://localhost:3000

---

## 三、技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16.2 (App Router) |
| 数据库 | SQLite (本地 dev.db) → 线上 Turso (libsql) |
| ORM | Prisma 5.22 + PrismaLibSQL 适配器 |
| 样式 | Tailwind CSS v4 (`@import "tailwindcss"`) |
| 认证 | jose JWT + bcryptjs |
| 运行时 | Node.js 20.x (服务器) / 24.x (本机) |
| 部署 | RackNerd VPS + PM2 + Nginx 反代 |

**特别警告**：
- 本机 `dev.db` **已废弃**，线上增删改查都连 Turso 云数据库
- `prisma db push` 会清表重建！改 schema 必须用 `prisma migrate dev`
- 客户端组件禁止 import `@/lib/prisma` 或 `@/lib/drama-schedule`（会把 libsql 拖进浏览器炸掉）
- 纯计算函数在 `drama-schedule-utils.ts`，含 prisma 的在 `drama-schedule.ts`
- Tailwind v4 的 `bg-[var(--brand)]` 有时不可靠，用 inline `style={{}}` 代替

---

## 四、服务器

| 项目 | 值 |
|---|---|
| IP | 192.255.132.108 |
| 机房 | RackNerd 洛杉矶 |
| SSH 密钥 | `~/.ssh/chenxi_deploy` |
| 备选密码 | root / Mt1dcv9jU46i7X7HQJ |
| 部署路径 | `/var/www/chenxi/` |
| 进程管理 | PM2 (名称 `chenxi`) |
| 反代 | Nginx 80 → localhost:3000 |
| SSL | Cloudflare Flexible (服务器无证书) |

### 关键命令

```bash
# SSH 登录
ssh -i ~/.ssh/chenxi_deploy root@192.255.132.108

# 项目操作
cd /var/www/chenxi
pm2 list                   # 进程状态
pm2 restart chenxi         # 重启
pm2 logs chenxi --lines 50 # 查日志
npm run build              # 构建 (需加 NODE_OPTIONS=--max-old-space-size=1536)

# 部署（本机 → 服务器）
rsync -a -e "ssh -i $HOME/.ssh/chenxi_deploy -o StrictHostKeyChecking=no" \
  "/Volumes/SamsungX5/Claude code/resource-blog/src/" \
  root@192.255.132.108:/var/www/chenxi/src/
```

### VPN 注意
SSH/部署时 **必须关** Shadowrocket/Clash；上 GitHub/npm/Turso 时 **必须开**。两者不能同时。

---

## 五、数据库

### Turso 云端

- 库名：`chenxi`
- URL：`libsql://chenxi-xiaoxi.aws-us-west-2.turso.io`
- Token：在服务器 `/var/www/chenxi/.env` 的 `TURSO_AUTH_TOKEN`
- 本地查询：`turso db shell chenxi "SELECT * FROM Drama LIMIT 5;"`

### 核心表

> ⚠️ 数据量会持续增长，以下只是写文档时的快照，**不要当作固定值**。
> 需要实际数量时用 SQL 查：`turso db shell chenxi "SELECT COUNT(*) FROM Drama;"`

| 表 | 用途 |
|---|---|
| `Drama` | 剧集主表 |
| `DownloadLink` | 下载链接 |
| `User` | 用户 |
| `UserFollowing` | 用户追剧记录 |
| `UserFavorite` | 用户收藏 |
| `Rating` | 评分 |
| `Comment` | 评论 |
| `Banner` | 首页 Banner |
| `Article` | 文章/资讯 |
| `VisitLog` | 访问日志 |

完整字段见 `prisma/schema.prisma`。

### Drama 表关键字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `isOnSchedule` | Boolean | 是否在追剧日历中显示 |
| `isUpcoming` | Boolean | 即将上线（显示在首页"即将上线"区） |
| `isNewlyAired` | Boolean | 新播（首播后 45 天内） |
| `isCompleted` | Boolean | 已完结 |
| `isSuspended` | Boolean | 暂缓播出（日历显示"另行通知"） |
| `airDays` | String | 播出日，逗号分隔，如 "0,2,4" |
| `pausedDays` | String | 本周停播日，逗号分隔 |
| `airTime` | String | 播出时间，如 "20:00" |
| `startDate` | DateTime | 首播日期 |
| `expectedDate` | DateTime | 预计开播日期 |
| `expectedPrecision` | String | 日期精度: day \| month \| year |
| `currentEpisode` | Int | 当前集数（自动更新） |
| `manualEpisode` | Int | 手动指定集数（优先于 currentEpisode） |
| `totalEpisodes` | Int | 总集数 |
| `episodesPerDay` | Int | 每天更新集数（默认 1） |
| `premiereEpisodes` | Int | 首播连更集数 |
| `completedAt` | DateTime | 完结日期（用于推算完结标签有效期） |

### airDays 映射（重要！）

```
0=周一, 1=周二, 2=周三, 3=周四, 4=周五, 5=周六, 6=周日
```

JS 转换：`new Date().getDay() === 0 ? 6 : new Date().getDay() - 1`

---

## 六、核心功能流程

### 1. 追剧日历 (`/schedule`)

**页面位置**：`src/app/schedule/page.tsx`

核心函数 `buildWeeklySchedule()` 在 `src/lib/drama-schedule-utils.ts`。

**日历显示规则**（按优先级）：
1. `isOnSchedule=true` + 有 `airDays` → 按播出日分配到各列
   - 已完结的：只显示到完结日为止（+30天窗口限制）
2. 新播剧（`isNewlyAired=true` 且 45 天内）→ 即使没勾 isOnSchedule 也显示
3. 即将上线（`isUpcoming=true` + 精确日期 `expectedPrecision=day`）→ 从首播周开始显示

**已知踩坑**：日历页之前被 Next.js 默认编译成静态页面，新加的剧不显示。已在页面上加 `force-dynamic` 修复。如果改了这个逻辑，确认页面是 dynamic 不是 static。

### 2. 我的追剧 (`/following`)

**页面位置**：`src/app/following/page.tsx`
**API**：`src/app/api/following/route.ts`

用户点击"追剧" → POST `/api/following` 带 `{ dramaId, status: 'watching' }` → 写入 `UserFollowing` 表。

### 3. 首播自动过渡

**脚本**：`scripts/update-episodes.ts`

自动检测 `isUpcoming` 且 `expectedDate` 已过且播出时间已过的剧，执行：
```
isUpcoming=false, isNewlyAired=true, isOnSchedule=!!airDays
```

也在剧集详情页 (`DramaDetailClient.tsx`) 中同步执行（访问详情页时触发）。

### 4. 集数计算

`calcCurrentEpisode()` 在 `drama-schedule-utils.ts`：
- `manualEpisode > 0` 优先
- 否则按 `startDate` + `airDays` 自动推算，首播日 = `premiereEpisodes`，之后每天 `episodesPerDay`

---

## 七、关键文件索引

| 文件 | 说明 |
|---|---|
| `src/app/schedule/page.tsx` | 追剧日历页 |
| `src/components/WeeklyCalendar.tsx` | 日历 UI + 排序 + 海报生成 |
| `src/components/DramaCard.tsx` | 剧集卡片（首页/全部剧集） |
| `src/components/DramaDetailClient.tsx` | 剧集详情页 + 追剧按钮 + 评分 + 评论区 |
| `src/app/following/page.tsx` | 我的追剧列表 |
| `src/app/admin/drama/page.tsx` | 后台剧集管理 |
| `src/lib/drama-schedule-utils.ts` | 排期计算纯函数（客户端可用） |
| `src/lib/drama-schedule.ts` | 含 Prisma 的排期函数（仅服务端） |
| `src/lib/prisma.ts` | Prisma 客户端单例 + BigInt 包装层 |
| `src/lib/auth.ts` | JWT 认证 |
| `prisma/schema.prisma` | 完整数据库模型 |
| `scripts/update-episodes.ts` | 剧集自动更新脚本 |
| `src/middleware.ts` | 路由鉴权（大部分页面需要登录） |
| `scripts/diagnose.ts` | 数据诊断脚本 |
| `CLOUD-INFRA.md` | 基础设施全档 |

---

## 八、已知踩坑 & 修复记录

### 已修问题

1. **追剧日历静态编译**（2026-07-08 修复）
   - 症状：新加的剧不在日历里
   - 原因：Next.js 默认把无动态 API 的 Server Component 编译成静态页
   - 修复：加 `export const dynamic = 'force-dynamic'`
   
2. **BigInt 序列化报错**
   - 症状：`NextResponse.json` 报错
   - 原因：libSQL 适配器把原始查询整数返成 BigInt
   - 修复：`src/lib/prisma.ts` 中包了一层转 number

3. **SSH 连不上**
   - 症状：Connection refused
   - 原因：本地 Shadowrocket/Clash VPN 拦截
   - 修复：关 VPN

4. **浏览器打不开（URL_INVALID）**
   - 症状：客户端 bundle 炸了
   - 原因：客户端组件 import 了含 libsql 的 prisma
   - 修复：拆出 `drama-schedule-utils.ts` 隔离纯函数

### 部署注意
- 只改 `src/` 后 rsync → npm run build → pm2 restart
- 纯改数据库数据不用重建，但页面如果是 static 就需要加 force-dynamic

### ⚠️ 添加新剧的标准流程（防裂图）

后台添加剧集必须严格按这个顺序，**漏一步就会出问题**：

1. **后台填资料**：标题、简介、地区、播出日、封面图
2. **点保存**：数据库写到 Turso
3. **同步图片到服务器**（如果图上传到了本机 `public/uploads/`）：
   ```bash
   rsync -a -e "ssh -i $HOME/.ssh/chenxi_deploy -o StrictHostKeyChecking=no" \
     "/Volumes/SamsungX5/Claude code/resource-blog/public/" \
     root@192.255.132.108:/var/www/chenxi/public/
   ```

**常见坑**：
- ❌ 后台填了标题没点保存 → 标题为空，剧情展示空字符串
- ❌ 上传了图但没同步 → 图裂开（数据库存了路径但服务器没文件）
- ❌ 数据库改完没同步 → 加的新剧前台不显示（页面是 static 的话）

**检查清单**（遇到图裂/剧不见时）：
1. 看 Turso 数据库里这部剧的 `title`、`coverImage` 字段有没有值
2. 看本机 `public/uploads/` 里有没有对应文件
3. 看服务器 `/var/www/chenxi/public/uploads/` 里有没有
4. 缺哪补哪

---

## 九、用户偏好（跟你对话的人）

| 偏好 | 说明 |
|---|---|
| 技术背景 | **小白**，非程序员，用 AI 辅助开发 |
| 语言 | **全程中文**，不要混英文术语 |
| 决策 | 技术分叉**直接替他选最优解**，不要让他二选一 |
| 风险 | 不可逆操作（删数据、花钱、改已有数据）要他确认 |
| 时间 | 操作前告知大概耗时 |
| 沟通 | 喜欢简洁，不要长篇命令 |
| VPN | SSH/部署期间不能开 VPN，提前跟他说明 |

### 绝对不要做的事
- ❌ 不能改/删已有的数据（剧集、账号、留言、链接）
- ❌ 不能擅自做不可逆的修改

---

## 十、部署流程

```bash
# 前提：VPN 已关

SRC="/Volumes/SamsungX5/Claude code/resource-blog"
KEY="$HOME/.ssh/chenxi_deploy"
HOST="root@192.255.132.108"
DST="/var/www/chenxi"

# 1) 同步 src/
rsync -a -e "ssh -i $KEY -o StrictHostKeyChecking=no" "$SRC/src/" "$HOST:$DST/src/"

# 2) 服务器构建
ssh -i $KEY $HOST "cd $DST && export NODE_OPTIONS=--max-old-space-size=1536 && npm run build 2>&1 | tail -20"

# 3) 重启
ssh -i $KEY $HOST "cd $DST && pm2 restart chenxi"

# 如果 .env 变了
scp -i $KEY "$SRC/.env" "$HOST:$DST/.env"
```

---

## 十一、快速上手 checklist（给 AI）

当我被叫来维护这个项目时，我应该：

1. 🚫 **先读本文档**——特别是【最高优先级规则】，**绝不擅自部署**
2. ✅ 只改本地代码，不碰服务器
3. ✅ VPN：部署关、Turso 开
4. ✅ 用 `turso db shell chenxi` 查数据库
5. ✅ 不改已有数据
6. ✅ 告知用户耗时
7. ✅ 替用户拍板，不给选择题
8. ✅ 改完告知「代码在本机，要部署时告诉我」

---

**最后更新**：2026-07-08
**编写者**：Claude Code（在用户指导下完成）
