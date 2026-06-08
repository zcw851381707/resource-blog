export interface SocialLink {
  name: string
  icon: string
  url?: string
  qrCode?: string
}

// 默认社交链接配置，后台可覆盖
export const defaultSocials: SocialLink[] = [
  { name: '微博', icon: 'WB', url: '' },
  { name: '抖音', icon: 'DY', url: '' },
  { name: 'B站', icon: 'BL', url: '' },
  { name: '小红书', icon: 'XHS', url: '' },
  { name: '微信公众号', icon: 'WX', qrCode: '' },
]
