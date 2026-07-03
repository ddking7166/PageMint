/** @jsxImportSource hono/jsx */
import { describe, expect, it } from 'vitest'

import { createPageMintApp, definePage } from '../dist/index.js'

import type { CacheEntry } from '../dist/index.js'

describe('createPageMintApp', () => {
  it('passes wildcard params to PageMint pages', async () => {
    const app = createPageMintApp()
    app.page(
      definePage({
        path: '/wild/*',
        load({ params }) {
          return { path: params['*'] }
        },
        render({ data }) {
          return <html><body>{data.path}</body></html>
        },
      }),
    )

    const response = await app.request('http://localhost/wild/a/b')

    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toContain('a/b')
  })

  it('registers named wildcard params through Hono catch-all routes', async () => {
    const app = createPageMintApp()
    app.page(
      definePage({
        path: '/docs/:path*',
        load({ params }) {
          return { path: params.path }
        },
        render({ data }) {
          return <html><body>{data.path}</body></html>
        },
      }),
    )

    const response = await app.request('http://localhost/docs/guides/cache')

    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toContain('guides/cache')
  })

  it('exposes tag revalidation on the Hono app', async () => {
    let version = 'v1'
    const entries = new Map<string, CacheEntry>()
    const app = createPageMintApp({
      cache: {
        async get(key) {
          return entries.get(key) ?? null
        },
        async set(key, entry) {
          entries.set(key, entry)
        },
        async delete(key) {
          entries.delete(key)
        },
      },
    })
    app.page(
      definePage({
        path: '/tagged',
        cache: {
          tags: ['hono-tagged'],
        },
        load() {
          return { version }
        },
        render({ data }) {
          return <html><body>{data.version}</body></html>
        },
      }),
    )

    await app.request('http://localhost/tagged')
    version = 'v2'
    const revalidated = await app.revalidateTag('hono-tagged')

    expect(revalidated).toHaveLength(1)
    expect(revalidated[0]?.html).toContain('v2')
  })
})
