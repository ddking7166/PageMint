import { cloneCacheEntry } from '@pagemint/core'

import type { CacheEntry, CacheStore } from '@pagemint/core'

export interface MemoryCacheStore extends CacheStore {
  clear(): void
  keys(): string[]
  size(): number
}

export function memoryCache(initialEntries?: Iterable<[string, CacheEntry]>): MemoryCacheStore {
  const entries = new Map<string, CacheEntry>()

  if (initialEntries) {
    for (const [key, entry] of initialEntries) {
      entries.set(key, cloneCacheEntry(entry))
    }
  }

  return {
    async get(key) {
      const entry = entries.get(key)
      return entry ? cloneCacheEntry(entry) : null
    },

    async set(key, entry) {
      entries.set(key, cloneCacheEntry(entry))
    },

    async delete(key) {
      entries.delete(key)
    },

    async has(key) {
      return entries.has(key)
    },

    clear() {
      entries.clear()
    },

    keys() {
      return Array.from(entries.keys())
    },

    size() {
      return entries.size
    },
  }
}

export { memoryCache as createMemoryCache }
