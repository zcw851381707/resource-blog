import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 800 });

// 先看登录页有什么
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
const title = await page.title();
console.log('login page title:', title);

// 找登录表单
const emailInput = await page.$('input[type="email"], input[name="email"]');
const pwdInput = await page.$('input[type="password"]');
console.log('email input:', !!emailInput, 'pwd input:', !!pwdInput);

if (emailInput && pwdInput) {
  // 试 admin@example.com
  await emailInput.type('admin@example.com');
  await pwdInput.type('admin123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));
  console.log('after login url:', page.url());
}

await browser.close();
