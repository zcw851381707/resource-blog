export function track(event: string, props?: Record<string, unknown>, page?: string) {
  if (process.env.NODE_ENV === 'development') return
  try {
    const payload = { event, props, page: page || window.location.pathname }
    navigator.sendBeacon?.('/api/analytics', JSON.stringify(payload))
  } catch {}
}

export const trackPageView = (page?: string) => track('page_view', undefined, page)
export const trackClick = (label: string, page?: string) => track('click', { label }, page)
export const trackFollow = (dramaId: string) => track('follow', { dramaId })
export const trackFavorite = (dramaId: string) => track('favorite', { dramaId })
export const trackComment = (dramaId: string) => track('comment', { dramaId })
export const trackSearch = (query: string) => track('search', { query })
