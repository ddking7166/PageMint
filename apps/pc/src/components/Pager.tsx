import type { AnyRecord } from '../lib/records.js'
import { staticListHref } from '../lib/seo-static-routes.js'

function cleanQuery(query?: AnyRecord, page?: number): string {
  const params = new URLSearchParams()
  Object.entries(query || {}).forEach(([key, value]) => {
    if (key === 'page' || key === 'is_search' || key === 'page_size') return
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  if (page && page > 1) params.set('page', String(page))
  return params.toString()
}

export function listHref(basePath: string, query?: AnyRecord, page?: number): string {
  const next: AnyRecord = {}
  Object.entries(query || {}).forEach(([key, value]) => {
    if (key === 'is_search' || key === 'page_size') return
    if (value === undefined || value === null || value === '') return
    next[key] = value
  })
  if (page && page > 1) next.page = String(page)

  if (
    basePath === '/channel' ||
    basePath === '/channel/filter' ||
    basePath.startsWith('/channel/filter/') ||
    basePath.startsWith('/category/') ||
    basePath.startsWith('/tag/')
  ) {
    return staticListHref(basePath, next)
  }

  const search = cleanQuery(query, page)
  return search ? `${basePath}?${search}` : basePath
}

export function Pager({
  total,
  pageSize,
  currentPage,
  basePath,
  query,
}: {
  total: number
  pageSize: number
  currentPage: number
  basePath: string
  query?: AnyRecord
}) {
  const lastPage = Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
  if (lastPage <= 1) return null
  const pages = Array.from({ length: Math.min(7, lastPage) }, (_, index) => {
    const start = Math.max(1, Math.min(currentPage - 3, lastPage - 6))
    return start + index
  }).filter((page) => page <= lastPage)

  return (
    <nav class="pager" aria-label="分页">
      {pages.map((page) => (
        <a href={listHref(basePath, query, page)} class={page === currentPage ? 'active' : ''}>
          {page}
        </a>
      ))}
    </nav>
  )
}
