// 内容审核：基于关键词的自动分类
// toxic → 自动清除（软删除 + flag=toxic）
// suspicious → 标记可疑，等管理员审核（flag=suspicious）
// clean → 正常（flag=clean）

// ─── 确定违规 → 自动清除 ───
const TOXIC_KEYWORDS = [
  // 政治敏感
  '习近平', '习大大', '李克强', '共产党', '中共', '六四', '天安门', '法轮功',
  '台独', '藏独', '疆独', '港独', '分裂国家', '颠覆国家',
  // 脏话
  '操你妈', '草泥马', '傻逼', '你妈逼', '日你妈', 'fuck', 'shit',
  '我操', '他妈', 'cnm', 'nmsl', 'sb', '草你妈',
  // 色情
  '色情', '裸聊', '约炮', '嫖娼', '卖淫', '三级片', 'A片', 'av',
  '成人电影', '黄色片', '情色',
  // 赌博毒品
  '赌博', '赌场', '百家乐', '彩票', '赌球',
  '毒品', '冰毒', '海洛因', '吸毒', '贩毒',
  // 广告
  '加微信', '加QQ', '微信号', 'QQ号', '客服',
]

// ─── 可疑 → 需要人工审核 ───
const SUSPICIOUS_KEYWORDS = [
  // 政治擦边
  '政府', '抗议', '游行', '示威', '民主', '自由', '人权',
  '专政', '独裁', '洗脑', '维稳',
  // 脏话擦边
  '混蛋', '白痴', '去死', '垃圾', '废物', '恶心',
  // 色情擦边
  '美女', '性感', '诱惑', '成人', '18禁',
  // 其他
  '举报', '投诉', '警告',
]

function includesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some(kw => lower.includes(kw))
}

export type CommentFlag = 'clean' | 'suspicious' | 'toxic'

export function moderateComment(content: string): { flag: CommentFlag; isDeleted: boolean } {
  // 高危词 → 直接清除
  if (includesAny(content, TOXIC_KEYWORDS)) {
    return { flag: 'toxic', isDeleted: true }
  }
  // 可疑词 → 标记待审
  if (includesAny(content, SUSPICIOUS_KEYWORDS)) {
    return { flag: 'suspicious', isDeleted: false }
  }
  return { flag: 'clean', isDeleted: false }
}
