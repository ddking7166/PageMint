import { describe, expect, it } from 'vitest'

import {
  cacheKeyWithQuery,
  createCacheKey,
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

  it('creates route cache keys from route params query and context', () => {
    expect(
      createCacheKey({
        route: '/movies/:id',
        params: { id: 42 },
        query: new URLSearchParams('b=2&a=1'),
        context: {
          lang: 'en',
          theme: 'dark',
          userId: 'u1',
        },
      }),
    ).toBe('page:/movies/:id|params:id=42|query:a=1&b=2|ctx:lang=en&theme=dark&userId=u1')
  })
})
