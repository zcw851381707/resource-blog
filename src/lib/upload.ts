import { unlink } from 'fs/promises'
import path from 'path'

// 获取上传目录的绝对路径
function getUploadDir() {
  return path.join(process.cwd(), 'public', 'uploads')
}

// 从 URL 中提取文件名，如 /api/uploads/123-abc.png → 123-abc.png
function extractFilename(url: string): string | null {
  const match = url.match(/\/api\/uploads\/([^/?]+)/)
  return match ? match[1] : null
}

// 删除上传的文件，url 为空或不匹配上传路径则静默跳过
export async function deleteUploadedFile(url: string | null | undefined): Promise<boolean> {
  if (!url) return false
  const filename = extractFilename(url)
  if (!filename) return false
  try {
    await unlink(path.join(getUploadDir(), filename))
    console.log(`[清理] 已删除: ${filename}`)
    return true
  } catch {
    // 文件可能已被删除，忽略
    return false
  }
}
