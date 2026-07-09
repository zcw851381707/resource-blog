const BASE = 'http://localhost:3000'

// 2ae64cfc 是转过头帮你擦眼泪（有 1 条评论）
const listRes = await fetch(`${BASE}/api/comments?dramaId=2ae64cfc-c071-4e8a-8d76-83d96bdabfe2&page=1&limit=10`)
const list = await listRes.json()
console.log('List status:', listRes.status, 'items:', list.items?.length || 0)
if (list.items?.length) {
  const c = list.items[0]
  console.log('Top comment: id=' + c.id.slice(0, 8))
  console.log('  user:', c.user.username, '(isAdmin=' + c.isAdmin + ')')
  console.log('  content:', c.content)
  console.log('  likes:', c.likeCount, 'replies:', c.replyCount, 'pinned:', c.pinned, 'liked:', c.liked)
  if (c.replies?.length) {
    console.log('  nested replies:', c.replies.length)
  }
}
