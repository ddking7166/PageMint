import type { DefinePageOptions, PageContext } from './types.js'

export type CacheKeyPart = string | number | boolean | null | undefined

export function createPageContext(
  request: Request,
  params: Record<string, string> = {},
): PageContext {
  const url = new URL(request.url)

  return {
    request,
    params,
    query: url.searchParams,
    pathname: url.pathname,
  }
}

export async function resolveCacheKey<TData>(
  page: DefinePageOptions<TData>,
  ctx: PageContext,
): Promise<string> {
  if (page.cache?.key) {
    return page.cache.key(ctx)
  }

  return defaultCacheKey(ctx)
}

export function defaultCacheKey(ctx: PageContext): string {
  const query = normalizeQuery(ctx.query)
  return query ? `page:${ctx.pathname}?${query}` : `page:${ctx.pathname}`
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
  }
}
