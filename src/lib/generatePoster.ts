import { toCanvas } from 'html-to-image'

/**
 * 将 DOM 元素生成为海报图片（PNG dataURL）
 * - 使用 html-to-image 渲染布局
 * - 手动重绘图片（Safari foreignObject 兼容）
 * - 支持 object-fit: cover、object-position、border-radius
 */
export async function generatePosterImage(
  element: HTMLElement,
  options?: {
    pixelRatio?: number
    backgroundColor?: string
    filename?: string
  }
): Promise<{ dataUrl: string; download: () => void }> {
  const scale = options?.pixelRatio ?? 2
  const bgColor = options?.backgroundColor ?? '#FFF5F5'
  const filename = options?.filename ?? '海报.png'

  // Step 1: html-to-image 渲染布局
  const canvas = await toCanvas(element, {
    pixelRatio: scale,
    backgroundColor: bgColor,
  })

  // Step 2: 手动把图片画到 canvas 正确位置（覆盖 Safari 可能丢失的图片）
  const ctx = canvas.getContext('2d')!
  const elRect = element.getBoundingClientRect()
  const imgs = element.querySelectorAll('img')
  for (const img of Array.from(imgs)) {
    if (!img.complete || img.naturalWidth === 0) continue
    const ir = img.getBoundingClientRect()
    const x = (ir.left - elRect.left) * scale
    const y = (ir.top - elRect.top) * scale
    const w = ir.width * scale
    const h = ir.height * scale
    // object-fit: cover 裁剪
    const natW = img.naturalWidth
    const natH = img.naturalHeight
    const imgAspect = natW / natH
    const boxAspect = w / h
    let sx = 0, sy = 0, sw = natW, sh = natH
    if (imgAspect > boxAspect) {
      sw = natH * boxAspect
      sx = (natW - sw) / 2
    } else {
      sh = natW / boxAspect
      sy = (natH - sh) / 2
    }
    // objectPosition 偏移
    const pos = (img as HTMLElement).style.objectPosition || 'center'
    if (pos && pos !== 'center') {
      const [px, py] = pos.split(' ').map((v: string) => parseFloat(v) || 0)
      if (px && imgAspect > boxAspect) sx = px / 100 * (natW - sw)
      if (py && imgAspect <= boxAspect) sy = py / 100 * (natH - sh)
    }
    // 圆角裁剪
    const br = parseFloat((img as HTMLElement).style.borderRadius) || 0
    ctx.save()
    if (br > 0) {
      ctx.beginPath()
      ctx.moveTo(x + br, y)
      ctx.arcTo(x + w, y, x + w, y + h, br)
      ctx.arcTo(x + w, y + h, x, y + h, br)
      ctx.arcTo(x, y + h, x, y, br)
      ctx.arcTo(x, y, x + w, y, br)
      ctx.closePath()
      ctx.clip()
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
    ctx.restore()
  }

  const dataUrl = canvas.toDataURL('image/png')

  const download = () => {
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
  }

  return { dataUrl, download }
}

/** 将图片 URL 转为可在海报中使用的完整 URL */
export function posterImgUrl(path: string): string {
  if (!path) return ''
  if (typeof window === 'undefined') return path
  if (path.startsWith('http')) return path
  return `${window.location.origin}${path}`
}
