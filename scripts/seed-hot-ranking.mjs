import { createClient } from '@libsql/client';
const c = createClient({
  url: 'libsql://chenxi-xiaoxi.aws-us-west-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODMzNjQxODUsImlkIjoiMDE5ZjM4YzgtOTUwMS03ZWI1LTkxYjUtYzExNTgwN2Y0Y2VmIiwia2lkIjoiNk5QT0lvOE1hWk9RNUFGRk05V2ZhTEtwVnRWR0pyVXltYXRvWDhGdUozayIsInJpZCI6Ijg4YzViOWJiLTM2OGItNDk4OS1hNzJjLTQyY2UxYmM0NDAwMyJ9.GXtYTfg0BgThE-en2FcUA7j9SN4gytdBTsFnc9SVGJQ1kFxa8uPfFF5PLo7d8G2UuHxDlDTuIiUSpbFH8yOnDw'
});

// 选前 10 部剧，按不同 clickCount 分阶梯
const targets = [
  { clicks: 8923, name: '寒阳风起春山境' },   // 1
  { clicks: 7541, name: '你在夏日之中' },      // 2
  { clicks: 6208, name: '入戏' },             // 3
  { clicks: 5187, name: '偿还' },             // 4
  { clicks: 4352, name: '炽热的他' },         // 5
  { clicks: 3891, name: '爱在是隆' },         // 6
  { clicks: 3245, name: '爱冲云霄·冲上云霄' }, // 7
  { clicks: 2876, name: '死神遇到爱' },       // 8
  { clicks: 2341, name: '通往天堂的门票' },   // 9
  { clicks: 1893, name: '心动预测' },         // 10
];

for (const t of targets) {
  // 用 LIKE 模糊匹配标题
  const result = await c.execute({
    sql: `UPDATE Drama SET clickCount = ? WHERE title LIKE ?`,
    args: [t.clicks, `%${t.name}%`]
  });
  if (result.rowsAffected > 0) {
    console.log(`✓ ${t.name}: clickCount = ${t.clicks}`);
  } else {
    console.log(`✗ ${t.name}: 未找到`);
  }
}

console.log('\n完成，刷新首页查看');
await c.close();
