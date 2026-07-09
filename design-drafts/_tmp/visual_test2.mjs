const BASE = 'http://localhost:3000'

// 1. 详情页 - 检查 SSR 是否含通知入口（导航栏）
const r1 = await fetch(`${BASE}/drama/2ae64cfc-c071-4e8a-8d76-83d96bdabfe2`)
const html1 = await r1.text()
console.log('--- 详情页 SSR 检查 ---')
console.log('Size:', html1.length)
// 这些是 SiteChrome 的内容，应该 SSR 渲染
console.log('  导航"个人中心":', html1.includes('个人中心') ? '✓' : '✗')
console.log('  导航"我的追剧":', html1.includes('我的追剧') ? '✓' : '✗')
console.log('  导航"我的收藏":', html1.includes('我的收藏') ? '✓' : '✗')
console.log('  导航"我的预约":', html1.includes('我的预约') ? '✓' : '✗')
console.log('  导航"通知" 入口:', html1.includes('通知中心') || html1.includes('>通知<') ? '✓' : '✗')
console.log('  导航"管理后台" (admin only):', html1.includes('管理后台') ? '✓' : '✗')

// 2. 通知中心页面
console.log('\n--- 通知中心页面 ---')
const r2 = await fetch(`${BASE}/notifications`)
const html2 = await r2.text()
console.log('Status:', r2.status, 'Size:', html2.length)
console.log('  标题"通知中心":', html2.includes('通知中心') ? '✓' : '✗')
console.log('  Tab"全部":', html2.includes('全部') ? '✓' : '✗')
console.log('  Tab"未读":', html2.includes('未读') ? '✓' : '✗')
console.log('  空状态文案:', html2.includes('暂无通知') || html2.includes('没有未读通知') ? '✓' : '✗')

// 3. 评论 API
console.log('\n--- 评论 API ---')
const r3 = await fetch(`${BASE}/api/comments?dramaId=2ae64cfc-c071-4e8a-8d76-83d96bdabfe2&page=1&limit=10`)
const d3 = await r3.json()
console.log('Status:', r3.status)
console.log('  返回字段 - items:', d3.items?.length)
console.log('  字段 likeCount:', d3.items?.[0]?.likeCount !== undefined ? '✓' : '✗')
console.log('  字段 replyCount:', d3.items?.[0]?.replyCount !== undefined ? '✓' : '✗')
console.log('  字段 pinned:', d3.items?.[0]?.pinned !== undefined ? '✓' : '✗')
console.log('  字段 liked:', d3.items?.[0]?.liked !== undefined ? '✓' : '✗')
console.log('  字段 replies:', 'replies' in (d3.items?.[0] || {}) ? '✓' : '✗')

// 4. like API (无登录应 401)
console.log('\n--- Like/Pin API 路由检查 ---')
const r4 = await fetch(`${BASE}/api/comments/test/like`, { method: 'POST' })
console.log('  like 未登录:', r4.status, '(期望 401)')
const r5 = await fetch(`${BASE}/api/comments/test/pin`, { method: 'POST' })
console.log('  pin 未登录:', r5.status, '(期望 401)')

// 5. 通知 API
console.log('\n--- 通知 API ---')
const r6 = await fetch(`${BASE}/api/notifications`)
const d6 = await r6.json()
console.log('  未登录 items:', d6.items?.length, 'unread:', d6.unreadCount)
