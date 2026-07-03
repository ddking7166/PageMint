# Cache

`CacheStore` is the only storage contract used by the core framework.

```ts
interface CacheStore {
  get(key: string): Promise<CacheEntry | null>
  set(key: string, entry: CacheEntry): Promise<void>
  delete(key: string): Promise<void>
  has?(key: string): Promise<boolean>
}
```

Use `ttl` for freshness and `staleTtl` for stale-while-revalidate behavior.

## Cache Tags

Use `cache.tags` to group cached pages for `revalidateTag()`.

```tsx
definePage({
  path: '/category/:id',
  cache: {
    key: ({ params }) => `category:${params.id}`,
    tags: ({ params }) => ['category', `category:${params.id}`],
  },
  load({ params }) {
    return fetchCategory(params.id)
  },
  render({ data }) {
    return <CategoryPage data={data} />
  },
})
```

Tags are stored on the rebuilt `CacheEntry` and indexed in the current process.

## Cache Key Helpers

`joinCacheKey()` keeps route keys readable:

```ts
joinCacheKey('pc', 'movie', params.id)
// pc:movie:123
```

`cacheKeyWithQuery()` appends sorted query params, so equivalent query strings produce the same cache key:

```ts
cacheKeyWithQuery('pc:channel', new URLSearchParams('b=2&a=1'))
// pc:channel:a=1&b=2
```

Use these helpers for application-level page keys before adding custom key logic.

## Full API

See [API Reference](./api.md) for every cache API, adapter API, parameter, return value, and type.
