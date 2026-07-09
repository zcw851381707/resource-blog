const res = await fetch('http://localhost:3000/notifications')
const html = await res.text()
// 输出 body 的 innerText 部分
const m = html.match(/<main[^>]*>([\s\S]+?)<\/main>/)
if (m) {
  console.log('--- main 内容前 2000 字符 ---')
  console.log(m[1].slice(0, 2000))
}
