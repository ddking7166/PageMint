import { text } from './records.js'

import type { AnyRecord } from './records.js'

export type ChannelStaticLabels = Partial<Record<'cat_id' | 'tag_id', Record<string, string>>>

const INTERNAL_CHANNEL_QUERY_KEYS = new Set(['is_search', 'page_size'])
const STATIC_ROUTE_KEYS = new Set(['category', 'tag', 'year', 'language', 'position', 'order', 'page'])

function firstQueryValue(value: unknown): string {
  if (Array.isArray(value)) return text(value[0])
  return text(value)
}

function encodeSegment(value: string | number): string {
  return encodeURIComponent(String(value).trim())
}

function decodeSegment(value?: string): string {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function seoSlug(value?: string | number | null, fallback?: string | number | null): string {
  const raw = text(value || fallback)
  if (!raw) return ''
  return encodeURIComponent(
    raw
      .replace(/[/?#]+/g, ' ')
      .replace(/\s+/g, '-')
      .toLowerCase(),
  )
}

export function normalizeChannelQuery(query?: AnyRecord): Record<string, string> {
  const normalized: Record<string, string> = {}
  Object.entries(query || {}).forEach(([key, value]) => {
    const next = firstQueryValue(value).trim()
    if (!next || INTERNAL_CHANNEL_QUERY_KEYS.has(key)) return
    normalized[key] = next
  })
  return normalized
}

export function collectionStaticPath(kind: 'category' | 'tag', id: string | number, label?: string | number | null): string {
  const normalizedId = encodeSegment(id)
  const slug = seoSlug(label, id)
  return slug ? `/${kind}/${normalizedId}/${slug}` : `/${kind}/${normalizedId}`
}

function labelFor(labels: ChannelStaticLabels | undefined, key: 'cat_id' | 'tag_id', value: string): string {
  return labels?.[key]?.[value] || value
}

export function appendStaticFilterSegments(
  basePath: string,
  query?: AnyRecord,
  options: {
    labels?: ChannelStaticLabels
    skipKeys?: string[]
    includeControls?: boolean
  } = {},
): string {
  const normalized = normalizeChannelQuery(query)
  const skipKeys = new Set(options.skipKeys || [])
  const segments: string[] = []

  if (!skipKeys.has('cat_id') && normalized.cat_id) {
    segments.push('category', encodeSegment(normalized.cat_id), seoSlug(labelFor(options.labels, 'cat_id', normalized.cat_id), normalized.cat_id))
  }
  if (!skipKeys.has('tag_id') && normalized.tag_id) {
    segments.push('tag', encodeSegment(normalized.tag_id), seoSlug(labelFor(options.labels, 'tag_id', normalized.tag_id), normalized.tag_id))
  }
  if (!skipKeys.has('year') && normalized.year) segments.push('year', encodeSegment(normalized.year))
  if (!skipKeys.has('language') && normalized.language) segments.push('language', encodeSegment(normalized.language))
  if (!skipKeys.has('position') && normalized.position) segments.push('position', encodeSegment(normalized.position))

  if (options.includeControls !== false) {
    if (!skipKeys.has('order') && normalized.order && normalized.order !== 'new') {
      segments.push('order', encodeSegment(normalized.order))
    }
    const page = Number(normalized.page || 1)
    if (!skipKeys.has('page') && Number.isFinite(page) && page > 1) {
      segments.push('page', encodeSegment(String(Math.trunc(page))))
    }
  }

  const cleanBase = basePath.replace(/\/+$/, '') || '/'
  if (!segments.length) return cleanBase === '/channel/filter' ? '/channel' : cleanBase
  return `${cleanBase === '/' ? '' : cleanBase}/${segments.filter(Boolean).join('/')}`
}

function channelSearchHref(query: Record<string, string>): string {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (INTERNAL_CHANNEL_QUERY_KEYS.has(key) || !value) return
    params.set(key, value)
  })
  const search = params.toString()
  return search ? `/channel?${search}` : '/channel'
}

export function channelStaticHref(query?: AnyRecord, labels?: ChannelStaticLabels): string {
  const normalized = normalizeChannelQuery(query)
  if (normalized.keywords) return channelSearchHref(normalized)

  if (normalized.cat_id) {
    const basePath = collectionStaticPath('category', normalized.cat_id, labelFor(labels, 'cat_id', normalized.cat_id))
    return appendStaticFilterSegments(basePath, normalized, { labels, skipKeys: ['cat_id'] })
  }

  if (normalized.tag_id) {
    const basePath = collectionStaticPath('tag', normalized.tag_id, labelFor(labels, 'tag_id', normalized.tag_id))
    return appendStaticFilterSegments(basePath, normalized, { labels, skipKeys: ['tag_id'] })
  }

  return appendStaticFilterSegments('/channel/filter', normalized, { labels })
}

export function staticListHref(basePath: string, query?: AnyRecord, labels?: ChannelStaticLabels): string {
  const normalized = normalizeChannelQuery(query)
  if (basePath === '/channel' || basePath === '/channel/filter') return channelStaticHref(normalized, labels)
  if (basePath.startsWith('/category/')) {
    return appendStaticFilterSegments(basePath, normalized, { labels, skipKeys: ['cat_id'] })
  }
  if (basePath.startsWith('/tag/')) {
    return appendStaticFilterSegments(basePath, normalized, { labels, skipKeys: ['tag_id'] })
  }
  return appendStaticFilterSegments(basePath, normalized, { labels })
}

export function parseStaticFilterSegments(segments: string[]): Record<string, string> {
  const query: Record<string, string> = {}
  for (let index = 0; index < segments.length; index += 1) {
    const key = segments[index]
    const value = decodeSegment(segments[index + 1])
    if (!key || !value) continue

    if (key === 'category') {
      query.cat_id = value
      index += 1
      if (segments[index + 1] && !STATIC_ROUTE_KEYS.has(segments[index + 1])) index += 1
    } else if (key === 'tag') {
      query.tag_id = value
      index += 1
      if (segments[index + 1] && !STATIC_ROUTE_KEYS.has(segments[index + 1])) index += 1
    } else if (key === 'year') {
      query.year = value
      index += 1
    } else if (key === 'language') {
      query.language = value
      index += 1
    } else if (key === 'position') {
      query.position = value
      index += 1
    } else if (key === 'order') {
      query.order = value
      index += 1
    } else if (key === 'page') {
      query.page = value
      index += 1
    }
  }
  return query
}
