'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import ArticleEditor from '@/components/ArticleEditor'

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [article, setArticle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then(r => { if (r.status === 404) { router.push('/admin/articles'); return null }; return r.json() })
      .then(data => { if (data) setArticle(data) })
      .finally(() => setLoading(false))
  }, [id, router])

  if (loading) return <p className="text-[var(--text-muted)]">加载中...</p>
  if (!article) return null

  return <ArticleEditor article={article} />
}
