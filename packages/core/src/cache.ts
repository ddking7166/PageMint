import type { CacheEntry, PageCacheOptions } from './types.js'

export function isFresh(entry: CacheEntry, now: number): boolean {
  return entry.staleAt === undefined || now < entry.staleAt
}

export function canServeStale(entry: CacheEntry, now: number): boolean {
  return entry.expireAt === undefined || now < entry.expireAt
}

export function createCacheEntry<TData>(input: {
  html: string
  dataHash?: string
  cache?: PageCacheOptions<TData>
  now: number
  status?: number
  tags?: string[]
  headers?: Record<string, string>
  previous?: CacheEntry | null
}): CacheEntry {
  const createdAt = input.previous?.createdAt ?? input.now
  const staleAt = input.cache?.ttl === undefined ? undefined : input.now + input.cache.ttl
  const expireAt =
    staleAt === undefined || input.cache?.staleTtl === undefined
      ? undefined
      : staleAt + input.cache.staleTtl

  return cleanEntry({
    html: input.html,
    dataHash: input.dataHash,
    createdAt,
    updatedAt: input.now,
    staleAt,
    expireAt,
    status: input.status ?? input.previous?.status,
    tags: input.tags ?? input.previous?.tags,
    headers: input.headers,
  })
}

export function refreshCacheEntry<TData>(
  entry: CacheEntry,
  cache: PageCacheOptions<TData> | undefined,
  now: number,
  tags = entry.tags,
): CacheEntry {
  return createCacheEntry({
    html: entry.html,
    dataHash: entry.dataHash,
    cache,
    now,
    status: entry.status,
    tags,
    headers: entry.headers,
    previous: entry,
  })
}

export function cloneCacheEntry(entry: CacheEntry): CacheEntry {
  return {
    ...entry,
    tags: entry.tags ? [...entry.tags] : undefined,
    headers: entry.headers ? { ...entry.headers } : undefined,
  }
}

function cleanEntry(entry: CacheEntry): CacheEntry {
  const cleaned: CacheEntry = {
    html: entry.html,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }

  if (entry.dataHash !== undefined) cleaned.dataHash = entry.dataHash
  if (entry.staleAt !== undefined) cleaned.staleAt = entry.staleAt
  if (entry.expireAt !== undefined) cleaned.expireAt = entry.expireAt
  if (entry.status !== undefined) cleaned.status = entry.status
  if (entry.tags !== undefined && entry.tags.length > 0) cleaned.tags = [...entry.tags]
  if (entry.headers !== undefined && Object.keys(entry.headers).length > 0) cleaned.headers = entry.headers

  return cleaned
}
