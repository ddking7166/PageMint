import type { CacheEntry, CacheStore } from '@pagemint/core'

export interface RedisLikeClient {
  get(key: string): Promise<string | null> | string | null
  set(key: string, value: string): Promise<unknown> | unknown
  del(key: string): Promise<unknown> | unknown
  exists?(key: string): Promise<number | boolean> | number | boolean
}

export interface RedisCacheOptions {
  prefix?: string
}

export function redisCache(client: RedisLikeClient, options: RedisCacheOptions = {}): CacheStore {
  const prefix = options.prefix ?? 'pagemint:'

  return {
    async get(key) {
      const raw = await client.get(namespaced(prefix, key))
      if (!raw) {
        return null
      }

      return JSON.parse(raw) as CacheEntry
    },

    async set(key, entry) {
      await client.set(namespaced(prefix, key), JSON.stringify(entry))
    },

    async delete(key) {
      await client.del(namespaced(prefix, key))
    },

    async has(key) {
      if (client.exists) {
        const value = await client.exists(namespaced(prefix, key))
        return typeof value === 'boolean' ? value : value > 0
      }

      return (await this.get(key)) !== null
    },
  }
}

export { redisCache as createRedisCache }

function namespaced(prefix: string, key: string): string {
  return `${prefix}${key}`
}
