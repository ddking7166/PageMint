import { cacheKeyWithQuery, joinCacheKey } from '@pagemint/hono'

import {
  createFankeContextFromRequest,
  getHomeData,
} from '../lib/fanke-api.js'
import { asArray } from '../lib/records.js'

import type { PageContext } from '@pagemint/hono'
import type { AnyRecord } from '../lib/records.js'

export type FankeContext = ReturnType<typeof createFankeContextFromRequest>

export function createPcContext(request: Request): FankeContext {
  return createFankeContextFromRequest(request, 'pc')
}

export function firstQuery(query: URLSearchParams): AnyRecord {
  return Object.fromEntries(query)
}

export function queryCacheKey(prefix: string, query: URLSearchParams): string {
  return cacheKeyWithQuery(prefix, query)
}

export function scopedQueryCacheKey(prefix: string, query: URLSearchParams, ...parts: Array<string | number | undefined>): string {
  return cacheKeyWithQuery(joinCacheKey(prefix, ...parts), query)
}

export function slugLabel(slug: string): string {
  try {
    return decodeURIComponent(slug).replace(/-/g, ' ').trim()
  } catch {
    return slug.replace(/-/g, ' ').trim()
  }
}

export function textFromStaticQuery(query: AnyRecord): string {
  return String(query.year || query.language || query.position || query.cat_id || query.tag_id || '片库')
}

export function wildcardSegments(ctx: Pick<PageContext, 'params'>): string[] {
  return String(ctx.params['*'] || '').split('/').filter(Boolean)
}

export async function resolvePlaylist(id: string, context: FankeContext): Promise<AnyRecord | null> {
  const homeData = await getHomeData(context)
  return asArray(homeData.playlists).find((playlist) => String(playlist.tag_id || '') === id) ?? null
}
