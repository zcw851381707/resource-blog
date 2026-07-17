import Database from 'better-sqlite3';
const db = new Database('prisma/dev.db');

const targets = [
  { clicks: 8923, name: '寒阳风起春山境' },
  { clicks: 7541, name: '你在夏日之中' },
  { clicks: 6208, name: '入戏' },
  { clicks: 5187, name: '偿还' },
  { clicks: 4352, name: '炽热的他' },
  { clicks: 3891, name: '爱在是隆' },
  { clicks: 3245, name: '爱冲云霄' },
  { clicks: 2876, name: '死神遇到爱' },
  { clicks: 2341, name: '通往天堂的门票' },
  { clicks: 1893, name: '心动预测' },
];

let updated = 0;
for (const t of targets) {
  const result = db.prepare(`UPDATE Drama SET clickCount = ? WHERE title LIKE ?`).run(t.clicks, `%${t.name}%`);
  if (result.changes > 0) {
    console.log(`✓ ${t.name}: ${t.clicks}`);
    updated++;
  } else {
    console.log(`✗ ${t.name}: 未找到`);
  }
}

// 顺手给一些别的剧也加点随机数据
const other = db.prepare(`SELECT id, title FROM Drama WHERE clickCount = 0 LIMIT 30`).all();
for (const d of other) {
  const random = Math.floor(Math.random() * 1500);
  db.prepare(`UPDATE Drama SET clickCount = ? WHERE id = ?`).run(random, d.id);
}
console.log(`\n另外随机填了 ${other.length} 部剧的 clickCount`);

console.log(`\n共更新 ${updated + other.length} 条`);
db.close();
