// 用 fetch + 检查 HTML 中的中文标记
const BASE = 'http://localhost:3000'
const res = await fetch(`${BASE}/drama/2ae64cfc-c071-4e8a-8d76-83d96bdabfe2`)
const html = await res.text()
console.log('Status:', res.status, 'Size:', html.length)
// 查找关键标记
const keywords = ['评论', '点赞', '回复', '精选', '通知', '通知中心']
for (const k of keywords) {
  // SSR 没渲染评论组件因为是 client side，但通知中心是 server side
  console.log(`  ${k}: ${html.includes(k) ? '✓' : '✗'}`)
}

// 找通知中心页面
const notifRes = await fetch(`${BASE}/notifications`)
console.log('\n/notifications status:', notifRes.status, 'size:', (await notifRes.text()).length)
const notifHtml = await notifRes.text()
console.log('  通知中心:', notifHtml.includes('通知中心') ? '✓' : '✗')
console.log('  全部已读:', notifHtml.includes('全部已读') ? '✓' : '✗')
