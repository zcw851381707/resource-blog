import { createClient } from '@libsql/client';
const c = createClient({
  url: 'libsql://chenxi-xiaoxi.aws-us-west-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODMzNjQxODUsImlkIjoiMDE5ZjM4YzgtOTUwMS03ZWI1LTkxYjUtYzExNTgwN2Y0Y2VmIiwia2lkIjoiNk5QT0lvOE1hWk9RNUFGRk05V2ZhTEtwVnRWR0pyVXltYXRvWDhGdUozayIsInJpZCI6Ijg4YzViOWJiLTM2OGItNDk4OS1hNzJjLTQyY2UxYmM0NDAwMyJ9.GXtYTfg0BgThE-en2FcUA7j9SN4gytdBTsFnc9SVGJQ1kFxa8uPfFF5PLo7d8G2UuHxDlDTuIiUSpbFH8yOnDw'
});
const r = await c.execute(`PRAGMA table_info('Drama')`);
console.log('Drama 表字段:');
r.rows.forEach(row => console.log(`  ${row[1]} (${row[2]})`));
await c.close();
