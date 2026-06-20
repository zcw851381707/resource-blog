import nodemailer from 'nodemailer'

const PORT = Number(process.env.EMAIL_PORT) || 465
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.qq.com',
  port: PORT,
  secure: PORT === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

const FROM = process.env.EMAIL_FROM || '晨光曦分享站'

export async function sendVerificationCode(to: string, code: string, purpose: 'register' | 'reset') {
  const label = purpose === 'register' ? '注册' : '重置密码'
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `晨光曦分享站·验证码`,
    html: `<p>您正在${label}晨光曦分享站账号。</p><p>验证码：<span style="font-size:24px;font-weight:bold;color:#D47060;background:#FFF5F5;padding:4px 8px">${code}</span></p><p>请在 15 分钟内完成验证，请勿将验证码泄露给他人。</p><p>如果您没有进行此操作，请忽略本邮件。</p>`,
  })
}

// 测试邮件连接
export async function testEmailConnection() {
  try {
    await transporter.verify()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
