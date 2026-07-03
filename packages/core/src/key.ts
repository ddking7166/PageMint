import type { CacheKeyContext, CacheKeyPart, DefinePageOptions, PageContext } from './types.js'

export interface CreateCacheKeyInput {
  route: string
  params?: Record<string, CacheKeyPart>
  query?: URLSearchParams | Record<string, CacheKeyPart>
  context?: CacheKeyContext
  prefix?: string
}

export function createPageContext(
  request: Request,
  params: Record<string, string> = {},
  cacheContext?: CacheKeyContext,
): PageContext {
  const url = new URL(request.url)

  return {
    request,
    params,
    query: url.searchParams,
    pathname: url.pathname,
    cacheContext,
  }
}

export async function resolveCacheKey<TRawData, TModel = TRawData>(
  page: DefinePageOptions<TRawData, TModel>,
  ctx: PageContext,
): Promise<string> {
  if (page.cache?.key) {
    return page.cache.key(ctx)
  }

  return defaultCacheKey(ctx)
}

export function defaultCacheKey(ctx: PageContext): string {
  const query = normalizeQuery(ctx.query)
  const context = normalizeCacheContext(ctx.cacheContext)
  const key = query ? `page:${ctx.pathname}?${query}` : `page:${ctx.pathname}`
  return context ? `${key}#${context}` : key
}

export function createCacheKey(input: CreateCacheKeyInput): string {
  const prefix = input.prefix ?? 'page'
  const route = normalizeRoute(input.route)
  const params = normalizeCacheContext(input.params)
  const query = normalizeKeyQuery(input.query)
  const context = normalizeCacheContext(input.context)
  const parts = [`${prefix}:${route}`]

  if (params) parts.push(`params:${params}`)
  if (query) parts.push(`query:${query}`)
  if (context) parts.push(`ctx:${context}`)

  return parts.join('|')
}

export function joinCacheKey(...parts: CacheKeyPart[]): string {
  return parts
    .filter((part) => part !== undefined && part !== null && part !== '')
    .map((part) => String(part))
    .join(':')
}

export function cacheKeyWithQuery(prefix: string, query: URLSearchParams): string {
  const normalized = normalizeQuery(query)
  return normalized ? `${prefix}:${normalized}` : prefix
}

export function normalizeQuery(query: URLSearchParams): string {
  const pairs = Array.from(query.entries()).sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    if (leftKey === rightKey) {
      return leftValue.localeCompare(rightValue)
    }

    return leftKey.localeCompare(rightKey)
  })

  return new URLSearchParams(pairs).toString()
}

export function normalizeCacheContext(context: CacheKeyContext | undefined): string {
  if (!context) {
    return ''
  }

  const pairs = Object.entries(context)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return String(leftValue).localeCompare(String(rightValue))
      }

      return leftKey.localeCompare(rightKey)
    })

  return new URLSearchParams(pairs.map(([key, value]) => [key, String(value)])).toString()
}

function normalizeKeyQuery(query: CreateCacheKeyInput['query']): string {
  if (!query) {
    return ''
  }

  if (query instanceof URLSearchParams) {
    return normalizeQuery(query)
  }

  return normalizeCacheContext(query)
}

function normalizeRoute(route: string): string {
  const normalized = route.trim() || '/'
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

export function createSyntheticRequest(pathOrUrl: string): Request {
  const url = new URL(pathOrUrl, 'http://localhost')
  return new Request(url)
}

export function clonePageContext(ctx: PageContext): PageContext {
  return {
    request: createSyntheticRequest(ctx.request.url),
    params: { ...ctx.params },
    query: new URLSearchParams(ctx.query),
    pathname: ctx.pathname,
    cacheContext: ctx.cacheContext ? { ...ctx.cacheContext } : undefined,
  }
}
