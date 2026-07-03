import type { CacheEntry, PageCacheOptions } from './types.js'

export function isFresh(entry: CacheEntry, now: number): boolean {
  return entry.staleAt === undefined || now < entry.staleAt
}

export function canServeStale(entry: CacheEntry, now: number): boolean {
  return entry.expireAt === undefined || now < entry.expireAt
}

export function createCacheEntry<TData>(input: {
  html: string
  modelHash?: string
  dataHash?: string
  storeSnapshot?: CacheEntry['storeSnapshot']
  cache?: PageCacheOptions<TData>
  now: number
  status?: number
  tags?: string[]
  dependencies?: string[]
  headers?: Record<string, string>
  previous?: CacheEntry | null
}): CacheEntry {
  const createdAt = input.previous?.createdAt ?? input.now
  const staleAt = input.cache?.ttl === undefined ? undefined : input.now + input.cache.ttl
  const expireAt =
    staleAt === undefined || input.cache?.staleTtl === undefined
      ? undefined
      : staleAt + input.cache.staleTtl
  const modelHash = input.modelHash ?? input.dataHash

  return cleanEntry({
    html: input.html,
    modelHash,
    dataHash: input.dataHash ?? modelHash,
    storeSnapshot: input.storeSnapshot ?? input.previous?.storeSnapshot,
    createdAt,
    updatedAt: input.now,
    staleAt,
    expireAt,
    status: input.status ?? input.previous?.status,
    tags: input.tags ?? input.previous?.tags,
    dependencies: input.dependencies ?? input.previous?.dependencies,
    headers: input.headers,
  })
}

export function refreshCacheEntry<TData>(
  entry: CacheEntry,
  cache: PageCacheOptions<TData> | undefined,
  now: number,
  tags = entry.tags,
  dependencies = entry.dependencies,
): CacheEntry {
  return createCacheEntry({
    html: entry.html,
    modelHash: cacheEntryModelHash(entry),
    dataHash: entry.dataHash ?? entry.modelHash,
    storeSnapshot: entry.storeSnapshot,
    cache,
    now,
    status: entry.status,
    tags,
    dependencies,
    headers: entry.headers,
    previous: entry,
  })
}

export function cloneCacheEntry(entry: CacheEntry): CacheEntry {
  return {
    ...entry,
    tags: entry.tags ? [...entry.tags] : undefined,
    dependencies: entry.dependencies ? [...entry.dependencies] : undefined,
    storeSnapshot: cloneStoreSnapshot(entry.storeSnapshot),
    headers: entry.headers ? { ...entry.headers } : undefined,
  }
}

export function cacheEntryModelHash(entry: CacheEntry | null | undefined): string | undefined {
  return entry?.modelHash ?? entry?.dataHash
}

function cleanEntry(entry: CacheEntry): CacheEntry {
  const cleaned: CacheEntry = {
    html: entry.html,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }

  if (entry.modelHash !== undefined) cleaned.modelHash = entry.modelHash
  if (entry.dataHash !== undefined) cleaned.dataHash = entry.dataHash
  if (entry.storeSnapshot !== undefined) cleaned.storeSnapshot = cloneStoreSnapshot(entry.storeSnapshot)
  if (entry.staleAt !== undefined) cleaned.staleAt = entry.staleAt
  if (entry.expireAt !== undefined) cleaned.expireAt = entry.expireAt
  if (entry.status !== undefined) cleaned.status = entry.status
  if (entry.tags !== undefined && entry.tags.length > 0) cleaned.tags = [...entry.tags]
  if (entry.dependencies !== undefined && entry.dependencies.length > 0) {
    cleaned.dependencies = [...entry.dependencies]
  }
  if (entry.headers !== undefined && Object.keys(entry.headers).length > 0) cleaned.headers = entry.headers

  return cleaned
}

function cloneStoreSnapshot(snapshot: CacheEntry['storeSnapshot']): CacheEntry['storeSnapshot'] {
  if (snapshot === undefined) {
    return undefined
  }

  return JSON.parse(JSON.stringify(snapshot)) as CacheEntry['storeSnapshot']
}
