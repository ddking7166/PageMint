import { MovieCardVertical } from '../components/MovieCard.js'
import { Pager } from '../components/Pager.js'
import { EmptyState, PcShell } from '../components/Shell.js'
import { asArray, text } from '../lib/records.js'
import { channelStaticHref, staticListHref } from '../lib/seo-static-routes.js'

import type { AnyRecord } from '../lib/records.js'

function firstQueryValue(value: unknown): string {
  if (Array.isArray(value)) return text(value[0])
  return text(value)
}

export function normalizeCatalogQuery(query: AnyRecord, overrides: AnyRecord = {}): AnyRecord {
  const normalized: AnyRecord = {}
  Object.entries(query || {}).forEach(([key, value]) => {
    const next = firstQueryValue(value)
    if (next) normalized[key] = next
  })
  return {
    page_size: '32',
    order: normalized.order || 'new',
    ...normalized,
    ...overrides,
  }
}

function resultItems(result: AnyRecord): AnyRecord[] {
  return asArray(result.data ?? result.items ?? result.list)
}

function queryLabelsFromFilters(filterList: AnyRecord[]): { cat_id: Record<string, string>; tag_id: Record<string, string> } {
  const labels = { cat_id: {} as Record<string, string>, tag_id: {} as Record<string, string> }
  asArray(filterList).forEach((row) => {
    asArray(row).forEach((item) => {
      const code = text(item.code)
      const value = text(item.value)
      const name = text(item.name)
      if ((code === 'cat_id' || code === 'tag_id') && value && name) labels[code][value] = name
    })
  })
  return labels
}

function queryHref(query: AnyRecord, filterList: AnyRecord[]): string {
  return channelStaticHref(query, queryLabelsFromFilters(filterList))
}

function filterQuery(query: AnyRecord, code: string, value: unknown): AnyRecord {
  const next: AnyRecord = {}
  Object.entries(query).forEach(([key, item]) => {
    if (['page', 'page_size', 'is_search'].includes(key)) return
    if (key === code) return
    if (item !== undefined && item !== null && item !== '') next[key] = item
  })

  if (code === 'cat_id') {
    const scoped: AnyRecord = {}
    if (query.order) scoped.order = query.order
    if (value !== undefined && value !== null && value !== '') scoped.cat_id = String(value)
    return scoped
  }

  if (value !== undefined && value !== null && value !== '') next[code] = String(value)
  return next
}

function orderQuery(query: AnyRecord, order: string): AnyRecord {
  const next: AnyRecord = { order }
  Object.entries(query).forEach(([key, value]) => {
    if (['order', 'page', 'page_size', 'is_search'].includes(key)) return
    if (value !== undefined && value !== null && value !== '') next[key] = value
  })
  return next
}

function clearKeywordsQuery(query: AnyRecord): AnyRecord {
  const next: AnyRecord = {}
  Object.entries(query).forEach(([key, value]) => {
    if (['keywords', 'page', 'page_size', 'is_search'].includes(key)) return
    if (value !== undefined && value !== null && value !== '') next[key] = value
  })
  return next
}

export function MovieCatalogPage({
  title,
  systemInfo,
  filterList,
  result,
  query,
  basePath = '/channel',
  forceFilters = false,
}: {
  title: string
  systemInfo: AnyRecord
  filterList: AnyRecord[]
  result: AnyRecord
  query: AnyRecord
  basePath?: string
  forceFilters?: boolean
}) {
  const items = resultItems(result)
  const total = Number(result.total || items.length || 0)
  const pageSize = Number(result.page_size || query.page_size || 32)
  const currentPage = Number(result.current_page || query.page || 1)
  const keywords = text(query.keywords)
  const heading = keywords ? `搜索：${keywords}` : title
  const showFilters = forceFilters || !keywords
  const labels = queryLabelsFromFilters(filterList)
  const pagerBasePath = keywords
    ? '/channel'
    : staticListHref(basePath, { ...query, page: '', order: '' }, labels)

  return (
    <PcShell
      title={`${heading} - ${text(systemInfo.site_name, '凡客影视')}`}
      systemInfo={systemInfo}
      currentLabel="首页"
    >
      <main class="catalog-page main-wrap">
        <h1 class="sr-only">{heading}</h1>
        {showFilters ? (
          <section class="catalog-filter">
            {asArray(filterList).map((filter, rowIndex) => (
              <div class="catalog-filter-row">
                {asArray(filter).map((item, index) => {
                  const code = text(item.code)
                  const value = item.value === undefined ? '' : String(item.value)
                  const active = query[code] === value || (index < 1 && !query[code])
                  return (
                    <a href={queryHref(filterQuery(query, code, value), filterList)} class={active ? 'active' : ''}>
                      {text(item.name)}
                    </a>
                  )
                })}
              </div>
            ))}
          </section>
        ) : null}

        <section class="catalog-toolbar">
          {showFilters ? (
            <nav class="catalog-order" aria-label="排序">
              {[
                ['new', '添加时间'],
                ['hot', '人气高低'],
                ['ranking', '收藏最多'],
              ].map(([value, label]) => (
                <a href={queryHref(orderQuery(query, value), filterList)} class={query.order === value ? 'active' : ''}>
                  {label}
                </a>
              ))}
            </nav>
          ) : null}
          {keywords ? (
            <a href={queryHref(clearKeywordsQuery(query), filterList)} class="keyword-chip" title={keywords}>
              <span>{keywords}</span>
              <span>×</span>
            </a>
          ) : null}
          <div class="catalog-total">
            共有 <span>{total}</span> 个筛选结果
          </div>
        </section>

        {total < 1 ? <EmptyState keywords={keywords || title} /> : null}
        <section class="catalog-grid-wrap">
          <div class="fk-vertical-grid">
            {items.map((item) => <MovieCardVertical item={item} />)}
          </div>
        </section>
        <Pager
          total={total}
          pageSize={pageSize}
          currentPage={currentPage}
          basePath={pagerBasePath}
          query={query}
        />
      </main>
    </PcShell>
  )
}
