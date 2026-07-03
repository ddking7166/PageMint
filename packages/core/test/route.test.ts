import { describe, expect, it } from 'vitest'

import { matchPath } from '../dist/index.js'

describe('route matching', () => {
  it('matches trailing wildcard routes', () => {
    expect(matchPath('/channel/filter/*', '/channel/filter/year/2026')).toEqual({
      params: { '*': 'year/2026' },
    })
  })

  it('matches named trailing wildcard routes', () => {
    expect(matchPath('/docs/:path*', '/docs/guides/cache')).toEqual({
      params: { path: 'guides/cache' },
    })
  })
})
