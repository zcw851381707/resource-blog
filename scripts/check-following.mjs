import { createClient } from '@libsql/client';
const c = createClient({
  url: 'libsql://chenxi-xiaoxi.aws-us-west-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODMzNjQxODUsImlkIjoiMDE5ZjM4YzgtOTUwMS03ZWI1LTkxYjUtYzExNTgwN2Y0Y2VmIiwia2lkIjoiNk5QT0lvOE1hWk9RNUFGRk05V2ZhTEtwVnRWR0pyVXltYXRvWDhGdUozayIsInJpZCI6Ijg4YzViOWJiLTM2OGItNDk4OS1hNzJjLTQyY2UxYmM0NDAwMyJ9.GXtYTfg0BgThE-en2FcUA7j9SN4gytdBTsFnc9SVGJQ1kFxa8uPfFF5PLo7d8G2UuHxDlDTuIiUSpbFH8yOnDw'
});
const r = await c.execute(`
  SELECT uf.userId, u.username, uf.status, uf.progress, uf.createdAt, uf.updatedAt, d.title
  FROM UserFollowing uf
  LEFT JOIN User u ON uf.userId = u.id
  LEFT JOIN Drama d ON uf.dramaId = d.id
  ORDER BY uf.updatedAt DESC
  LIMIT 20
`);
console.log('UserFollowing 数据:');
r.rows.forEach(row => {
  console.log(`  用户${row[1]} | ${row[2]} | ${row[3]}集`);
  console.log(`    剧: ${row[6]}`);
  console.log(`    创建: ${row[4]} | 更新: ${row[5]}`);
});
await c.close();
