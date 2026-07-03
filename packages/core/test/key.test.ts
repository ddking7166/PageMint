import { describe, expect, it } from 'vitest'

import {
  cacheKeyWithQuery,
  createPageContext,
  defaultCacheKey,
  definePage,
  joinCacheKey,
  resolveCacheKey,
} from '../dist/index.js'

describe('cache key generation', () => {
  it('creates a stable default key from pathname and sorted query params', () => {
    const ctx = createPageContext(new Request('http://localhost/docs?b=2&a=1'))

    expect(defaultCacheKey(ctx)).toBe('page:/docs?a=1&b=2')
  })

  it('uses a page-level custom key when provided', async () => {
    const page = definePage({
      path: '/movies/:id',
      cache: {
        key: ({ params }) => `page:movie:${params.id}`,
      },
      load() {
        return { title: 'Movie' }
      },
      render() {
        return '<html></html>'
      },
    })
    const ctx = createPageContext(new Request('http://localhost/movies/42'), { id: '42' })

    await expect(resolveCacheKey(page, ctx)).resolves.toBe('page:movie:42')
  })

  it('joins cache key parts and appends sorted query params', () => {
    expect(joinCacheKey('pc', 'movie', 42, undefined, '')).toBe('pc:movie:42')
    expect(cacheKeyWithQuery('pc:channel', new URLSearchParams('b=2&a=1'))).toBe('pc:channel:a=1&b=2')
  })
})
