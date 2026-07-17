#!/bin/bash
# 每日排名快照脚本 - 每天凌晨 0:05 用 crontab 或 pm2 调度
# 记录当天 TOP 10 排名到 DailyRanking 表，用于计算霸榜标签

cd /var/www/chenxi
NODE_PATH=./node_modules node -e "
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
const { createClient } = require('@libsql/client');

const p = new PrismaClient({
  adapter: new PrismaLibSQL(createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  }))
});

(async () => {
  const today = new Date().toISOString().split('T')[0];
  const all = await p.drama.findMany({
    where: { clickCount: { gt: 0 } },
    orderBy: { clickCount: 'desc' },
    take: 50,
    select: { id: true, clickCount: true },
  });

  for (let i = 0; i < all.length; i++) {
    const rank = i + 1;
    const isTop10 = rank <= 10;
    try {
      await p.dailyRanking.upsert({
        where: { dramaId_date: { dramaId: all[i].id, date: today } },
        update: { rank, isTop10 },
        create: { dramaId: all[i].id, date: today, rank, isTop10 },
      });
    } catch {}
  }

  const count = await p.dailyRanking.count({ where: { date: today } });
  console.log('[' + new Date().toISOString() + '] DailyRanking snapshot saved: ' + count + ' dramas');
  await p.\$disconnect();
})().catch(e => { console.error('snapshot error:', e.message); process.exit(1); });
"
