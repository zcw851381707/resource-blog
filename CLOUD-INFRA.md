# 晨光曦·分享站 - 云端基础设施全档（CGX851.COM）

> 任何接手本项目的 AI 或开发者，看完本文即可上手，**无需问"服务器在哪""数据库怎么连"这类基础问题**。
>
> 最后更新：2026-07-07

---

## 0. 一图流（先看这张图就能定位）

```
       你的 Mac 浏览器
            ↓ (https://cgx851.com)
       Cloudflare (SSL Flexible 灵活)
            ↓ (HTTPS → 源HTTP)
       RackNerd 洛杉矶服务器
       192.255.132.108
       Nginx:80 → 127.0.0.1:3000
       Next.js 16 (PM2 管理)
            ↓ (HTTP libsql adapter)
       Turso 云数据库
       libsql://chenxi-xiaoxi.aws-us-west-2.turso.io
       位置：aws-us-west-2 (Oregon)
       库名：chenxi
       分组：default
```

**关键事实速记**：
- 服务器 = RackNerd 洛杉矶 `192.255.132.108`（已付费 $35.99/年）
- 数据库 = Turso 云端（免费）`libsql://chenxi-xiaoxi.aws-us-west-2.turso.io`
- 域名 = `cgx851.com`（在 Cloudflare）
- 代码 = 本机一份 + 服务器一份（部署靠 rsync）
- 数据 = 一份在 Turso，**任何端连接都看到同一份**

---

## 1. 服务器 RackNerd

### 基本信息
- **IP**：`192.255.132.108`
- **机房**：洛杉矶 DC03LA287KVM
- **配置**：Ubuntu 24.04 LTS / 2 vCPU / 2GB RAM / 34GB SSD / x86_64
- **加了 2GB swap**（构建 Next 16 防 OOM）
- **已装**：Node.js v20.20.2 / PM2 7.0.3 / Nginx 1.24.0 / Git / rsync / openssh-server

### 登录方式
- **首选 SSH 免密**（已配）：
  ```bash
  ssh -i ~/.ssh/chenxi_deploy root@192.255.132.108
  ```
  本机密钥：`~/.ssh/chenxi_deploy`（ed25519）
  服务器 `~/.ssh/authorized_keys` 已装对应公钥
- **备选密码**（如密钥丢失）：`Mt1dcv9jU46i7X7HQJ`（root 用户）
- **状态**：root 密码登录仍开启（建议保留作为备援，无需关闭）

### 目录结构
```
/var/www/chenxi/                # 部署根目录（代码 + .env）
├── .env                         # 运行时环境变量（含 Turso URL+token、JWT_SECRET、SMTP）
├── .env.local                   # Vercel OIDC token（部署用，可忽略）
├── node_modules/                # 依赖
├── .next/                       # Next.js 构建产物
├── public/                      # 静态资源（含 public/uploads 上传文件）
├── prisma/
│   ├── schema.prisma
│   └── dev.db                   # 已无意义（Turso 已成主库），仅作 schema 留档
├── src/                         # 源代码
└── scripts/
```

### 进程管理（PM2）
```bash
ssh -i ~/.ssh/chenxi_deploy root@192.255.132.108
pm2 list                        # 查看状态
pm2 logs chenxi --lines 50      # 查日志
pm2 restart chenxi              # 重启
pm2 restart chenxi --update-env # 重启并重载 .env
pm2 save                        # 保存当前进程列表
pm2 startup                     # 配开机自启（已配过）
```

### Nginx 反代配置
- 文件：`/etc/nginx/sites-available/chenxi`
- 行为：80 端口反代 `http://127.0.0.1:3000`
- `client_max_body_size 100M`（后台可上传大文件）
- 当前**只有 80 端口**，**没有 443**（HTTPS 由 Cloudflare 提供，模式 Flexible）
- 如需改 Nginx：编辑后 `nginx -t && systemctl reload nginx`

### 重启服务
```bash
# 完整重启（构建后）
ssh -i ~/.ssh/chenxi_deploy root@192.255.132.108
cd /var/www/chenxi
pm2 restart chenxi
# 查日志
pm2 logs chenxi --lines 30
```

---

## 2. 数据库 Turso（核心）

### 基本信息
- **库名**：`chenxi`
- **分组**：`default`
- **位置**：`aws-us-west-2`（Oregon）
- **URL**：`libsql://chenxi-xiaoxi.aws-us-west-2.turso.io`
- **认证 Token**：在 `/var/www/chenxi/.env` 的 `TURSO_AUTH_TOKEN`（**绝对不要明文贴到任何聊天**）

### 工具：turso CLI
- 已安装在 Mac：`/opt/homebrew/bin/turso`
- 已登录账号：`xiaoxi`（用户用 Google 登录的）
- 常用命令：
  ```bash
  turso auth whoami              # 看登录状态
  turso db list                  # 列库
  turso db show chenxi           # 看库详情
  turso db shell chenxi          # 进入 SQL shell
  turso db tokens create chenxi  # 生成新 token（生产环境用新的）
  ```

### 当前数据规模（截止 2026-07-07）
| 表 | 数量 |
|---|---|
| Drama | 110 |
| DownloadLink | 313 |
| Article | 8 |
| Comment | 12 |
| User | 2 |
| VisitLog | 4068 |
| Banner | 5 |
| ResourceRequest | 9 |
| UserFollowing | 2 |
| UserFavorite | 2 |
| Rating | 4 |
| DramaSubscription | 4 |
| Notification | 1 |
| CommentLike | 1 |
| BannedWord | 0 |
| InviteCode | 0 |
| EmailCode | 0 |

### 如何查询数据
```bash
# 方式 1: turso shell
turso db shell chenxi "SELECT id, title FROM Drama LIMIT 5;"

# 方式 2: 在服务器上通过 Prisma
ssh -i ~/.ssh/chenxi_deploy root@192.255.132.108
cd /var/www/chenxi
node -e "const{PrismaClient}=require('@prisma/client');const{PrismaLibSQL}=require('@prisma/adapter-libsql');const{createClient}=require('@libsql/client');const p=new PrismaClient({adapter:new PrismaLibSQL(createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN}))});(async()=>{const n=await p.drama.count();console.log('Drama count:',n);process.exit(0)})()"
```

### **重要：不要做的事**
- ❌ **不要用 `turso db create` 新建库覆盖现有 `chenxi`**——会丢全部 110 部剧
- ❌ **不要把本地 dev.db 重新覆盖导入**——会覆盖云端
- ❌ **不要从 Turso 删除 drama/user/comment**——会丢数据
- ❌ 改 schema 后直接 `prisma db push` 会**清表重建**！必须先备份（见下）

### 如果要改 schema（危险操作）
```bash
# 1. 先备份整个库到本地
turso db dump chenxi --output /tmp/chenxi-backup-$(date +%Y%m%d).sql

# 2. 改 schema.prisma

# 3. 改 prisma/schema.prisma
# 4. 决定改的方式：
#    - 增量迁移（推荐）：prisma migrate dev --name xxx（生成 migration）
#    - 直接同步：prisma db push（破坏性！会清表）

# 5. 部署：
#    - 本地 prisma generate
#    - rsync 同步 schema.prisma 到服务器
#    - 服务器 prisma generate + 重启 PM2
```

### 备份与恢复
```bash
# 备份
turso db dump chenxi --output /tmp/chenxi-$(date +%Y%m%d).sql
# 恢复（覆盖性！慎用）
turso db shell chenxi < /tmp/chenxi-20260707.sql
```

---

## 3. 域名 Cloudflare

### 域名
- `cgx851.com`（在 Cloudflare 注册并受保护）
- 用户是 Cloudflare 账号所有者

### DNS 记录
- `cgx851.com` → A → `192.255.132.108` → **已代理**（橙云）
- `www.cgx851.com` → A → `192.255.132.108` → **已代理**（橙云）
- 添加/修改在 dashboard：`https://dash.cloudflare.com` → cgx851.com → DNS → 记录

### SSL/TLS 配置
- **加密模式** = **Flexible**（手动选，不是"自动"）
- 原因：服务器没装证书，Full 模式 Cloudflare 会连不上导致网站挂
- **HTTP/3 (QUIC)** = 默认开。Chrome 访问可能因 UDP 443 干扰失败，但实测本地 HTTP/2 工作正常
- **如果想升级到 Full/Strict 模式**（更安全）：
  1. 在服务器用 certbot 装 Let's Encrypt 证书
  2. 或在 Cloudflare → SSL → 源服务器 → 创建源证书
  3. Nginx 加 443 server block 配证书
  4. Cloudflare 加密模式改"完全(严格)"

### Cloudflare 路由实测
- `cf-ray` 显示走 `HKG`（香港）节点 → LA 服务器

---

## 4. 代码架构

### 关键文件位置
- 项目根：`/Volumes/SamsungX5/Claude code/resource-blog/`
- Prisma client 单例：`src/lib/prisma.ts`
- 数据库 schema：`prisma/schema.prisma`
- 排程工具（纯函数，客户端可用）：`src/lib/drama-schedule-utils.ts`
- 排程主文件（含 prisma，仅服务端）：`src/lib/drama-schedule.ts`
- 后台剧集管理：`src/app/admin/drama/page.tsx`

### 重要的代码改动（不要回退）

#### a. Prisma 客户端（`src/lib/prisma.ts`）
- 改用 `PrismaLibSQL` 适配器连接 Turso
- **关键**：包了一层把 `$queryRaw/$queryRawUnsafe` 结果里的 BigInt 转回 number
  - 原因：libSQL 适配器把原始查询的整数返成 BigInt，导致 `NextResponse.json` 报错和算术运算失败
  - **这层包装绝对不能删**

#### b. Schema（`prisma/schema.prisma`）
- generator 加了 `previewFeatures = ["driverAdapters"]`
- datasource 仍为 sqlite（driverAdapters 让它能跑在 libsql 上）

#### c. 客户端 bundle 隔离
- 9 个 `'use client'` 组件从 `@/lib/drama-schedule-utils` 导入纯函数
- `src/lib/drama-schedule.ts` 只剩 `hydrateDramaDisplayFields`（含 prisma）和 re-export
- **绝对不要让客户端组件再 import `@/lib/prisma` 或 `@/lib/drama-schedule`**——会把 libsql 拖进浏览器炸

### 依赖
- `@prisma/client@5.22.0`
- `@prisma/adapter-libsql@5.22.0`
- `@libsql/client`
- `next@^16.2.7`
- 其他略

---

## 5. 部署流程

### 完整重新部署（从 0 到线上）
```bash
# 前提：VPN（Shadowrocket）已关，~/.ssh/chenxi_deploy 存在

SRC="/Volumes/SamsungX5/Claude code/resource-blog"
KEY="$HOME/.ssh/chenxi_deploy"
HOST="root@192.255.132.108"
DST="/var/www/chenxi"

# 1) 同步整个 src/ 到服务器
rsync -a -e "ssh -i $KEY -o StrictHostKeyChecking=no" \
  "$SRC/src/" "$HOST:$DST/src/"

# 2) 同步 .env（本地和服务器必须都有，里面含 TURSO token）
#    如果本地 .env 变了，需要 scp 过去；通常用 ssh 手动改
scp -i $KEY "$SRC/.env" "$HOST:$DST/.env"
scp -i $KEY "$SRC/.env.local" "$HOST:$DST/.env.local"

# 3) 同步 public/ 的上传文件（如有新增）
rsync -a -e "ssh -i $KEY -o StrictHostKeyChecking=no" \
  --exclude='uploads.zip' --exclude='*.orig' \
  "$SRC/public/" "$HOST:$DST/public/"

# 4) 服务器重建
ssh -i $KEY $HOST "cd $DST && export NODE_OPTIONS=--max-old-space-size=1536 && npm run build 2>&1 | tail -20"

# 5) 重启
ssh -i $KEY $HOST "cd $DST && pm2 restart chenxi"

# 6) 自检
ssh -i $KEY $HOST "curl -sI https://cgx851.com/login | head -3"
```

### 增量修改（推荐）
只改 `src/` 下文件，rsync 同步过去 → 重建 → 重启。
不需要传 node_modules / .next / public 中未变文件。

### 本地开发
```bash
cd "/Volumes/SamsungX5/Claude code/resource-blog"
# .env 里已配 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN
npm run dev
# 访问 http://localhost:3000
# 改完想推服务器，rsync + build + pm2 restart
```

---

## 6. 数据流与权限

### 谁可以改什么
- **用户（老板）**：通过 https://cgx851.com 后台改数据库数据
- **同事**：同上（同一份账号）
- **开发者（AI/我）**：改代码和配置；**禁止改/删/覆盖已有数据**（110部剧、账号、留言、链接）

### 共享数据（云端 Turso）
- 本地 `localhost:3000` → 写 Turso
- 服务器 `https://cgx851.com` → 写 Turso
- 同事浏览器 → 写 Turso
- **所有端共享同一份**，谁加的其他人立刻看到

### 已经有数据
- Drama: 110 部
- DownloadLink: 313 条
- 全部从最初本地 dev.db 迁移过来
- **不要覆盖、删除、修改**

---

## 7. 已知问题 & 坑（踩过的）

### 已修
- ~~RackNerd SSH 连不上~~：实为本地 Shadowrocket VPN 拦截（关 VPN 即可）。详见 `~/.claude/projects/-Users-zhuchenwen/memory/racknerd-ssh-issue.md`
- ~~浏览器打不开 cgx851.com（URL_INVALID）~~：客户端 bundle 污染 prisma → 拆出 `drama-schedule-utils.ts` 隔离
- ~~BigInt 序列化报错~~：libsql 适配器原始查询返 BigInt → 包装层转 number

### 还存在的
- **Cloudflare SSL 是 Flexible 模式**：访客→Cloudflare 加密，Cloudflare→服务器**明文 HTTP**。游客侧安全，但服务器侧建议升级到 Full/Strict（需装证书）
- **HTTP/3 在 Cloudflare 默认开**：某些国内网络打不开。Chrome 端通过 `chrome://flags/#enable-quic` 关闭可缓解；Cloudflare Dashboard 当前面板里没暴露此开关（可能在 Speed → Optimization 隐藏）
- **从国内直连 Cloudflare 慢**：cf-ray 走 HKG 节点，跨国到 LA 服务器有 RTT 延迟。日常建议挂 VPN 访问更快

### 易错
- ❌ macOS 自带 `openrsync` 不支持 `--info=progress2`、`--info=stats2` 等参数（用了会报参数错）。用 `rsync -a` 最稳
- ❌ rsync **不会删服务器上多余的文件**。如本机删了文件想同步，rsync 加 `--delete`（但**会误删服务器上的 .env**，要先 `--exclude` 保护）
- ❌ 改 schema 后 `prisma db push` 会**清表重建**。必须用 `prisma migrate dev` 或先备份
- ❌ 本地 `dev.db` 已废弃（云端才是主库），不要再用 `prisma db push` 推 schema
- ❌ `turso db create --from-file` 需要 dev.db 是 WAL 模式（用副本传，原文件保持默认 journal mode）
- ❌ 部署期间 VPN 必须关；上 GitHub/npm/Turso 时 VPN 必须开。**两者不能同时**

---

## 8. 关键命令速查

```bash
# === 服务器 ===
ssh -i ~/.ssh/chenxi_deploy root@192.255.132.108           # 登录
pm2 list                                                  # 进程状态
pm2 logs chenxi --lines 50                                # 查日志
pm2 restart chenxi --update-env                           # 重启并重载环境变量
systemctl reload nginx                                    # 重载 Nginx

# === 数据库 ===
turso auth whoami                                         # 登录状态
turso db list                                             # 列库
turso db shell chenxi "SELECT COUNT(*) FROM Drama;"       # 查
turso db dump chenxi --output /tmp/backup.sql             # 备份
turso db tokens create chenxi                             # 新 token

# === 部署 ===
rsync -a -e "ssh -i $HOME/.ssh/chenxi_deploy -o StrictHostKeyChecking=no" \
  "/Volumes/SamsungX5/Claude code/resource-blog/src/" \
  root@192.255.132.108:/var/www/chenxi/src/                # 同步 src

ssh -i $HOME/.ssh/chenxi_deploy root@192.255.132.108 \
  "cd /var/www/chenxi && NODE_OPTIONS=--max-old-space-size=1536 npm run build"  # 重建
```

---

## 9. 相关记忆/文档指针
- `~/.claude/projects/-Users-zhuchenwen/memory/racknerd-ssh-issue.md` — SSH 不通的真正原因（本地 VPN）
- `~/.claude/projects/-Users-zhuchenwen/memory/chenxi-deploy-progress.md` — 部署过程时间线
- `~/.claude/projects/-Users-zhuchenwen/memory/no-data-modification.md` — 数据不可改规范
- `~/.claude/projects/-Users-zhuchenwen/memory/feedback-decide-for-beginner.md` — 用户是小白，技术分叉替他拍板
- `prisma/schema.prisma` 内有完整数据库结构
- `src/lib/prisma.ts` 内含 BigInt 包装层（关键）
- 此前还有 `/Volumes/SamsungX5/Claude code/drama-website-handover.md`（更早的旧版，已部分过时）

---

## 10. 用户偏好（影响协作方式）
- 用户是**技术小白**（非程序员，用 AI 辅助）
- 倾向**中文**交流
- 喜欢看到结果，但需要解释**为什么这么做**（用大白话）
- 给技术选项时**直接替用户拍板**，不让他二选一
- 重大/不可逆操作（删数据、花钱、对外发布）仍要他确认
- 操作前**给预估耗时**
- 用户**不喜欢看长串英文命令**，要简洁、注释
- 部署/SSH 期间不要开 Shadowrocket VPN

---

## 11. 如果需要重做

1. 服务器重装：按本次部署流程重做（rsync + npm install + build + PM2 + Nginx）
2. 数据库重做：Turso 在，永不丢
3. 域名重配：Cloudflare 两条 A 记录
4. 完整重做从 0：先看 `chenxi-deploy-progress.md` 了解历史决策

---

**TL;DR（30 秒读这一份）**：
服务器 = `192.255.132.108`（SSH 用 `~/.ssh/chenxi_deploy`）
数据库 = `libsql://chenxi-xiaoxi.aws-us-west-2.turso.io`（token 在服务器 `.env`）
域名 = `cgx851.com`（Cloudflare 灵活 SSL）
改代码 = 本机改 → rsync src/ → 服务器 build → pm2 restart
改数据 = 后台直接改，**别删别动已有 110 部剧**
VPN 跷跷板 = SSH/部署关、GitHub/npm/Turso 开
