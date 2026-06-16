'use client'

import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'

interface RichEditorProps {
  content: string
  onChange: (html: string) => void
}

const COLORS = [
  '#000000', '#333333', '#666666', '#999999',
  '#D47060', '#E89080', '#E74C3C', '#C0392B',
  '#2980B9', '#3498DB', '#27AE60', '#2ECC71',
  '#F39C12', '#E67E22', '#8E44AD', '#9B59B6',
]

const HIGHLIGHTS = [
  '#FFFACD', '#FFD700', '#FFB6C1', '#FFA07A',
  '#90EE90', '#87CEEB', '#DDA0DD', '#F0E68C',
  '#FFC0CB', '#B0E0E6',
]

export default function RichEditor({ content, onChange }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ allowBase64: true }),
      Link.configure({ openOnClick: false }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: '在这里写文章... 可以从公众号 Ctrl+V 直接粘贴' }),
    ],
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[400px] px-4 py-3 outline-none text-[var(--text-primary)]',
      },
    },
  })

  // 同步外部 content 变化到编辑器
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) return <div className="min-h-[400px] bg-[var(--bg-card)] rounded-lg border border-[var(--border)]" />

  return (
    <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)]">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-[var(--border)] bg-[var(--bg-secondary)] sticky top-0 z-40 rounded-t-lg">
        {/* 文本格式 */}
        <Btn icon="B" title="加粗" label="加粗" active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()} />
        <Btn icon="I" title="斜体" label="斜体" active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()} />
        <Btn icon="U" title="下划线" label="下划线" active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()} />
        <Btn icon={<span className="line-through">S</span>} title="删除线" label="删除线" active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()} />

        <Sep />

        {/* 标题 */}
        <Btn icon="H1" title="大标题" label="大标题" active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
        <Btn icon="H2" title="中标题" label="中标题" active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <Btn icon="H3" title="小标题" label="小标题" active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />

        <Sep />

        {/* 字体颜色 */}
        <ColorPicker icon="A" colors={COLORS} title="字体颜色" label="字体颜色"
          onSelect={(c) => editor.chain().focus().setColor(c).run()}
          active={!!editor.getAttributes('textStyle').color} />

        {/* 背景高亮 */}
        <ColorPicker icon={<span className="px-0.5 rounded" style={{ background: '#FFFACD' }}>A</span>}
          colors={HIGHLIGHTS} title="背景高亮" label="背景高亮"
          onSelect={(c) => editor.chain().focus().setHighlight({ color: c }).run()}
          active={editor.isActive('highlight')} />

        <Sep />

        {/* 对齐 */}
        <Btn icon="⫷" title="左对齐" label="左对齐" active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()} />
        <Btn icon="≣" title="居中" label="居中" active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()} />
        <Btn icon="⫸" title="右对齐" label="右对齐" active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()} />

        <Sep />

        {/* 列表 & 引用 */}
        <Btn icon="•" title="无序列表" label="无序列表" active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <Btn icon="1." title="有序列表" label="有序列表" active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <Btn icon="❝" title="引用" label="引用" active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()} />

        <Sep />

        {/* 插入 */}
        <Btn icon="🖼" title="插入图片" label="图片"
          onClick={() => { const url = prompt('图片 URL:'); if (url) editor.chain().focus().setImage({ src: url }).run() }} />
        <Btn icon="🔗" title="插入链接" label="链接"
          onClick={() => { const url = prompt('链接 URL:'); if (url) editor.chain().focus().setLink({ href: url }).run() }} />
        <Btn icon="—" title="分割线" label="分割线"
          onClick={() => editor.chain().focus().setHorizontalRule().run()} />

        <Sep />

        {/* 工具 */}
        <LocalizeBtn editor={editor} />
        <BeautifyBtn editor={editor} />
      </div>

      <div className="rounded-b-lg overflow-hidden">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

// ---- 小型组件 ----

function Btn({ icon, title, active, onClick, label }: {
  icon: React.ReactNode; title: string; active?: boolean; onClick: () => void; label?: string
}) {
  return (
    <button type="button" onClick={onClick} title={title}
      className={`flex flex-col items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
        active ? 'bg-[var(--brand)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
      }`}>
      <span className="text-xs leading-none">{icon}</span>
      {label && <span className="leading-none opacity-80">{label}</span>}
    </button>
  )
}

function Sep() {
  return <span className="w-px h-5 bg-[var(--border)] mx-0.5" />
}

function ColorPicker({ icon, colors, title, onSelect, active, label }: {
  icon: React.ReactNode; colors: string[]; title: string; onSelect: (c: string) => void; active: boolean; label?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} title={title}
        className={`flex flex-col items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
          active ? 'ring-1 ring-[var(--brand)]' : 'hover:bg-[var(--bg-card)]'
        }`}>
        <span className="text-xs leading-none">{icon}</span>
        {label && <span className="leading-none opacity-80">{label}</span>}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] shadow-xl z-50 grid grid-cols-8 gap-1"
          onMouseLeave={() => setOpen(false)}>
          {colors.map(c => (
            <button key={c} type="button"
              onClick={() => { onSelect(c); setOpen(false) }}
              className="w-5 h-5 rounded border border-[var(--border)] hover:scale-125 transition-transform"
              style={{ background: c }} title={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function LocalizeBtn({ editor }: { editor: any }) {
  const [loading, setLoading] = useState(false)
  const handleLocalize = async () => {
    const html = editor.getHTML()
    if (!html.includes('<img')) return alert('文章中没有图片')
    setLoading(true)
    try {
      const res = await fetch('/api/articles/localize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      })
      if (!res.ok) throw new Error('下载失败')
      const data = await res.json()
      editor.commands.setContent(data.html)
    } catch { alert('图片下载失败，请重试') }
    finally { setLoading(false) }
  }

  return (
    <button type="button" onClick={handleLocalize} disabled={loading}
      className="flex flex-col items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] hover:bg-[var(--bg-card)] transition-colors text-orange-500 disabled:opacity-50"
      title="下载文章中的远程图片到本地">
      <span className="text-xs leading-none">{loading ? '⏳' : '📥'}</span>
      <span className="leading-none opacity-80">下载图片</span>
    </button>
  )
}

function BeautifyBtn({ editor }: { editor: any }) {
  const handleBeautify = () => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(editor.getHTML(), 'text/html')
    const body = doc.body

    // 辅助：创建空行段落
    const makeSpacer = () => {
      const p = doc.createElement('p')
      p.innerHTML = '&nbsp;'
      return p
    }
    const isEmpty = (el: Element) => {
      const t = (el.textContent || '').replace(/[\s ]/g, '')
      return t === '' && !el.querySelector('img')
    }

    // 1. 图片从段落中提取出来，独立成行
    body.querySelectorAll('p img').forEach(img => {
      const parentP = img.closest('p')
      if (!parentP || !parentP.parentNode) return

      const beforeText = doc.createElement('p')
      const afterText = doc.createElement('p')

      const beforeNodes: Node[] = []
      for (const child of parentP.childNodes) {
        if (child === img) break
        beforeNodes.push(child.cloneNode(true))
      }
      const afterNodes: Node[] = []
      let found = false
      for (const child of parentP.childNodes) {
        if (child === img) { found = true; continue }
        if (found) afterNodes.push(child.cloneNode(true))
      }

      beforeNodes.forEach(n => beforeText.appendChild(n))
      afterNodes.forEach(n => afterText.appendChild(n))

      // 替换原段落（不额外加空格，后续统一加）
      const ref = parentP
      if (!isEmpty(beforeText)) ref.parentNode!.insertBefore(beforeText, ref)
      ref.parentNode!.insertBefore(img.cloneNode(true), ref)
      if (!isEmpty(afterText)) ref.parentNode!.insertBefore(afterText, ref)
      ref.remove()
    })

    // 2. 给所有直接 img（不在 p 内的）包裹 p
    body.querySelectorAll('img').forEach(img => {
      if (img.parentElement?.tagName !== 'P') {
        const wrapper = doc.createElement('p')
        img.parentNode?.insertBefore(wrapper, img)
        wrapper.appendChild(img)
      }
    })

    // 3. 删除所有空段落
    const toRemove: Element[] = []
    body.querySelectorAll('p').forEach(p => {
      if (isEmpty(p)) toRemove.push(p)
    })
    toRemove.forEach(el => el.remove())

    // 4. 每个段落之间插入一个空行
    const allP = Array.from(body.querySelectorAll('p'))
    for (let i = allP.length - 1; i >= 0; i--) {
      const p = allP[i]
      const next = p.nextElementSibling
      if (next && next.tagName === 'P') {
        // 两个段落之间 → 插入空行
        if (p.parentNode) {
          p.parentNode.insertBefore(makeSpacer(), next)
        }
      }
    }

    // 5. 合并连续空行，最多保留 1 个
    const checkMerge = () => {
      const ps = body.querySelectorAll('p')
      for (let i = ps.length - 1; i > 0; i--) {
        if (isEmpty(ps[i]) && isEmpty(ps[i - 1])) {
          ps[i].remove()
          return true
        }
      }
      return false
    }
    while (checkMerge()) {}

    // 6. 清理开头空行
    while (body.firstElementChild && isEmpty(body.firstElementChild)) {
      body.firstElementChild.remove()
    }

    editor.commands.setContent(body.innerHTML)
  }

  return (
    <button type="button" onClick={handleBeautify}
      className="flex flex-col items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] hover:bg-[var(--bg-card)] transition-colors text-purple-500"
      title="一键美化：图片独立成行，段落间空一行">
      <span className="text-xs leading-none">✨</span>
      <span className="leading-none opacity-80">美化</span>
    </button>
  )
}
