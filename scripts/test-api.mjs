import { createClient } from '@libsql/client';
const c = createClient({
  url: 'libsql://chenxi-xiaoxi.aws-us-west-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODMzNjQxODUsImlkIjoiMDE5ZjM4YzgtOTUwMS03ZWI1LTkxYjUtYzExNTgwN2Y0Y2VmIiwia2lkIjoiNk5QT0lvOE1hWk9RNUFGRk05V2ZhTEtwVnRWR0pyVXltYXRvWDhGdUozayIsInJpZCI6Ijg4YzViOWJiLTM2OGItNDk4OS1hNzJjLTQyY2UxYmM0NDAwMyJ9.GXtYTfg0BgThE-en2FcUA7j9SN4gytdBTsFnc9SVGJQ1kFxa8uPfFF5PLo7d8G2UuHxDlDTuIiUSpbFH8yOnDw'
});

// 查 Drama 表中 clickCount 最高的前 10
const r = await c.execute(`
  SELECT title, clickCount, isOnSchedule, isNewlyAired, isCompleted
  FROM Drama
  WHERE clickCount > 0
  ORDER BY clickCount DESC
  LIMIT 15
`);
console.log('Drama 表中 clickCount > 0 的剧：');
r.rows.forEach(row => {
  console.log(`  ${row[0]} | clickCount=${row[1]} | on=${row[2]} new=${row[3]} done=${row[4]}`);
});

console.log('\n总数:', r.rows.length);
await c.close();
