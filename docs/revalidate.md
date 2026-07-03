# Revalidate

PageMint supports path-based and key-based revalidation.

```ts
await app.revalidate('/movies/123')
await app.revalidateByKey('page:movie:123')
await app.revalidateTag('movie')
await app.invalidate('/movies/123')
await app.invalidateByKey('page:movie:123')
```

External checks can be registered with `app.revalidator.register()` and started with `app.revalidator.start()`.

## Path Revalidation

`app.revalidate(pathOrUrl)` rebuilds the page matching a path or URL.

```ts
await app.revalidate('/movies/123?source=web')
```

The page must have `cache` enabled. Query parameters are included when PageMint resolves the cache key.

## Key Revalidation

`app.revalidateByKey(key)` rebuilds a known cache key.

```ts
await app.revalidateByKey('page:movie:123')
```

Custom keys need a known page context. PageMint learns that context after the key is requested or after path revalidation resolves the key.

## Tag Revalidation

Add `cache.tags` to one or more pages:

```tsx
definePage({
  path: '/movies/:id',
  cache: {
    key: ({ params }) => `movie:${params.id}`,
    tags: ({ params }) => ['movie', `movie:${params.id}`],
  },
  load({ params }) {
    return fetchMovie(params.id)
  },
  render({ data }) {
    return <MoviePage movie={data} />
  },
})
```

Then rebuild all currently known pages for a tag:

```ts
await app.revalidateTag('movie')
await app.revalidateTag('movie:123')
```

Tag behavior:

- Tags are trimmed, deduplicated, sorted, and stored on `CacheEntry.tags`.
- Tags are indexed in memory when a cached page is requested or rebuilt.
- `revalidateTag()` only knows keys seen by the current process.
- For multi-process deployments, broadcast tag revalidation to each process or region.

## Invalidation

`app.invalidate(pathOrUrl)` and `app.invalidateByKey(key)` delete cache entries. Key invalidation also removes the key from the in-process tag index.

## Full API

See [API Reference](./api.md) for every revalidation API, parameter, return value, and type.
