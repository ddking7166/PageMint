/** @jsxImportSource hono/jsx */
import { describe, expect, it } from 'vitest'

import { memoryCache } from '../../cache-memory/dist/index.js'
import {
  createPageContext,
  createPMStore,
  definePage,
  Island,
  matchPath,
  PageMintEngine,
  redirect,
  usePMStore,
} from '../dist/index.js'

import type { RegisteredPage } from '../dist/index.js'

describe('PageMintEngine', () => {
  it('serves cache misses and hits with structured model hashes', async () => {
    let loadCalls = 0
    const cache = memoryCache()
    const engine = new PageMintEngine({ cache })
    const page = engine.registerPage(
      definePage({
        path: '/hit',
        cache: { ttl: 1000 },
        load() {
          loadCalls += 1
          return { value: 'cached' }
        },
        render({ data, model }) {
          expect(model).toEqual(data)
          return <html><body>{data.value}</body></html>
        },
      }),
    )

    const first = await handle(engine, page, '/hit')
    const second = await handle(engine, page, '/hit')

    expect(first.cacheStatus).toBe('miss')
    expect(second.cacheStatus).toBe('hit')
    expect(loadCalls).toBe(1)
    expect(second.entry?.modelHash).toBeDefined()
  })

  it('serves stale HTML immediately and rebuilds in the background', async () => {
    let now = 0
    let value = 'v1'
    const cache = memoryCache()
    const engine = new PageMintEngine({
      cache,
      now: () => now,
    })
    const page = engine.registerPage(
      definePage({
        path: '/stale',
        cache: {
          ttl: 10,
          staleTtl: 100,
        },
        load() {
          return { value }
        },
        render({ data }) {
          return <html><body>{data.value}</body></html>
        },
      }),
    )

    const first = await handle(engine, page, '/stale')
    expect(first.cacheStatus).toBe('miss')
    expect(first.html).toContain('v1')

    now = 11
    value = 'v2'
    const stale = await handle(engine, page, '/stale')
    expect(stale.cacheStatus).toBe('stale')
    expect(stale.html).toContain('v1')

    await tick()
    const updated = await cache.get('page:/stale')
    expect(updated?.html).toContain('v2')
  })

  it('runs one builder for concurrent requests to the same key', async () => {
    let now = 0
    let loadCalls = 0
    const deferred = createDeferred<void>()
    const cache = memoryCache()
    const engine = new PageMintEngine({ cache, now: () => now })
    const page = engine.registerPage(
      definePage({
        path: '/lock',
        cache: { ttl: 100 },
        async load() {
          loadCalls += 1
          await deferred.promise
          return { value: 'locked' }
        },
        render({ data }) {
          return <html><body>{data.value}</body></html>
        },
      }),
    )

    const requests = [handle(engine, page, '/lock'), handle(engine, page, '/lock'), handle(engine, page, '/lock')]
    await tick()
    expect(loadCalls).toBe(1)

    deferred.resolve()
    const responses = await Promise.all(requests)
    expect(responses.map((response) => response.cacheStatus)).toEqual(['miss', 'miss', 'miss'])
    expect(responses.every((response) => response.html.includes('locked'))).toBe(true)
    now += 1
  })

  it('does not render again when the data hash is unchanged', async () => {
    let now = 0
    let renderCalls = 0
    const cache = memoryCache()
    const engine = new PageMintEngine({ cache, now: () => now })
    const page = engine.registerPage(
      definePage({
        path: '/hash-same',
        cache: {
          ttl: 0,
          staleTtl: 0,
          hash: (data) => data.version,
        },
        load() {
          return { version: 'same', label: 'first' }
        },
        render({ data }) {
          renderCalls += 1
          return <html><body>{data.label}</body></html>
        },
      }),
    )

    const first = await handle(engine, page, '/hash-same')
    now = 1
    const second = await handle(engine, page, '/hash-same')

    expect(first.html).toContain('first')
    expect(second.html).toContain('first')
    expect(renderCalls).toBe(1)
  })

  it('renders again when the data hash changes', async () => {
    let now = 0
    let renderCalls = 0
    let version = 'v1'
    const cache = memoryCache()
    const engine = new PageMintEngine({ cache, now: () => now })
    const page = engine.registerPage(
      definePage({
        path: '/hash-change',
        cache: {
          ttl: 0,
          staleTtl: 0,
          hash: (data) => data.version,
        },
        load() {
          return { version }
        },
        render({ data }) {
          renderCalls += 1
          return <html><body>{data.version}</body></html>
        },
      }),
    )

    const first = await handle(engine, page, '/hash-change')
    version = 'v2'
    now = 1
    const second = await handle(engine, page, '/hash-change')

    expect(first.html).toContain('v1')
    expect(second.html).toContain('v2')
    expect(renderCalls).toBe(2)
  })

  it('normalizes raw load data before hashing and rendering', async () => {
    let renderCalls = 0
    const cache = memoryCache()
    const engine = new PageMintEngine({ cache })
    const page = engine.registerPage(
      definePage({
        path: '/normalize',
        cache: {
          modelHash: (model) => model.title,
        },
        load() {
          return {
            rawTitle: '  Normalized  ',
          }
        },
        normalize(raw) {
          return {
            title: raw.rawTitle.trim(),
          }
        },
        render({ data }) {
          renderCalls += 1
          return <html><body>{data.title}</body></html>
        },
      }),
    )

    const response = await handle(engine, page, '/normalize')

    expect(response.html).toContain('Normalized')
    expect(response.entry?.modelHash).toBe('Normalized')
    expect(renderCalls).toBe(1)
  })

  it('invalidates cached HTML by path', async () => {
    const cache = memoryCache()
    const engine = new PageMintEngine({ cache })
    const page = engine.registerPage(
      definePage({
        path: '/invalidate/:id',
        cache: {
          key: ({ params }) => `page:invalidate:${params.id}`,
        },
        load() {
          return { value: 'cached' }
        },
        render({ data }) {
          return <html><body>{data.value}</body></html>
        },
      }),
    )

    await handle(engine, page, '/invalidate/1')
    expect(await cache.has('page:invalidate:1')).toBe(true)

    await engine.invalidate('/invalidate/1')
    expect(await cache.has('page:invalidate:1')).toBe(false)
  })

  it('preserves page status and headers from render helpers', async () => {
    const engine = new PageMintEngine()
    const page = engine.registerPage(
      definePage({
        path: '/old',
        load() {
          return {}
        },
        render() {
          return redirect('/new', 301)
        },
      }),
    )

    const response = await handle(engine, page, '/old')

    expect(response.status).toBe(301)
    expect(response.headers.location).toBe('/new')
  })

  it('revalidates all known pages for a cache tag', async () => {
    let now = 0
    let version = 'v1'
    const cache = memoryCache()
    const engine = new PageMintEngine({ cache, now: () => now })
    const page = engine.registerPage(
      definePage({
        path: '/tagged/:id',
        cache: {
          ttl: 100,
          tags: ({ params }) => ['tagged', `tagged:${params.id}`],
        },
        load({ params }) {
          return { id: params.id, version }
        },
        render({ data }) {
          return <html><body>{data.id}:{data.version}</body></html>
        },
      }),
    )

    await handle(engine, page, '/tagged/a')
    await handle(engine, page, '/tagged/b')

    version = 'v2'
    now = 1
    const entries = await engine.revalidateTag('tagged')

    expect(entries).toHaveLength(2)
    expect((await cache.get('page:/tagged/a'))?.html).toContain('a:v2')
    expect((await cache.get('page:/tagged/b'))?.html).toContain('b:v2')
  })

  it('supports invalidateTag as the tag invalidation API', async () => {
    let version = 'v1'
    const cache = memoryCache()
    const engine = new PageMintEngine({ cache })
    const page = engine.registerPage(
      definePage({
        path: '/invalidate-tag',
        cache: {
          tags: ['movie:123'],
        },
        load() {
          return { version }
        },
        render({ data }) {
          return <html><body>{data.version}</body></html>
        },
      }),
    )

    await handle(engine, page, '/invalidate-tag')
    version = 'v2'
    const entries = await engine.invalidateTag('movie:123')

    expect(entries).toHaveLength(1)
    expect((await cache.get('page:/invalidate-tag'))?.html).toContain('v2')
  })

  it('revalidates pages through dependency graph propagation', async () => {
    let version = 'v1'
    const cache = memoryCache()
    const engine = new PageMintEngine({ cache })
    engine.addDependency('movie:123', 'category:action')
    engine.addDependency('category:action', 'homepage')

    const moviePage = engine.registerPage(
      definePage({
        path: '/movies/123',
        cache: { ttl: 1000 },
        dependencies: ['movie:123'],
        load() {
          return { version }
        },
        render({ data }) {
          return <html><body>movie:{data.version}</body></html>
        },
      }),
    )
    const categoryPage = engine.registerPage(
      definePage({
        path: '/category/action',
        cache: { ttl: 1000 },
        dependencies: ['category:action'],
        load() {
          return { version }
        },
        render({ data }) {
          return <html><body>category:{data.version}</body></html>
        },
      }),
    )
    const homePage = engine.registerPage(
      definePage({
        path: '/',
        cache: { ttl: 1000 },
        dependencies: ['homepage'],
        load() {
          return { version }
        },
        render({ data }) {
          return <html><body>home:{data.version}</body></html>
        },
      }),
    )

    await handle(engine, moviePage, '/movies/123')
    await handle(engine, categoryPage, '/category/action')
    await handle(engine, homePage, '/')

    version = 'v2'
    const entries = await engine.invalidateDependency('movie:123')

    expect(entries).toHaveLength(3)
    expect((await cache.get('page:/movies/123'))?.html).toContain('movie:v2')
    expect((await cache.get('page:/category/action'))?.html).toContain('category:v2')
    expect((await cache.get('page:/'))?.html).toContain('home:v2')
  })

  it('removes invalidated keys from tag revalidation', async () => {
    let version = 'v1'
    const cache = memoryCache()
    const engine = new PageMintEngine({ cache })
    const page = engine.registerPage(
      definePage({
        path: '/tag-invalidate/:id',
        cache: {
          tags: ['tag-invalidate'],
        },
        load({ params }) {
          return { id: params.id, version }
        },
        render({ data }) {
          return <html><body>{data.id}:{data.version}</body></html>
        },
      }),
    )

    await handle(engine, page, '/tag-invalidate/a')
    await handle(engine, page, '/tag-invalidate/b')
    await engine.invalidate('/tag-invalidate/a')

    version = 'v2'
    const entries = await engine.revalidateTag('tag-invalidate')

    expect(entries).toHaveLength(1)
    expect(await cache.get('page:/tag-invalidate/a')).toBeNull()
    expect((await cache.get('page:/tag-invalidate/b'))?.html).toContain('b:v2')
  })

  it('injects PM Store into rendering and stores cache snapshots', async () => {
    let version = 'v1'
    const cache = memoryCache()
    const store = createPMStore({
      cartCount: 1,
    })
    const engine = new PageMintEngine({ cache, store })
    const page = engine.registerPage(
      definePage({
        path: '/store',
        cache: {
          ttl: 100,
        },
        dependencies: ['cart'],
        load() {
          return { version }
        },
        render() {
          const pmStore = usePMStore<typeof store.state>()
          return (
            <html>
              <body>
                <Island id="cart" client="signal">
                  <span data-pm-text="cartCount">{pmStore.state.cartCount}</span>
                  <span>{version}</span>
                </Island>
              </body>
            </html>
          )
        },
      }),
    )

    const first = await handle(engine, page, '/store')
    expect(first.html).toContain('data-pagemint-store-state="true"')
    expect(first.html).toContain('"cartCount":1')
    expect(first.entry?.storeSnapshot).toEqual({ cartCount: 1 })

    version = 'v2'
    store.state.cartCount = 2
    store.invalidate('cart')
    await tick()
    const updated = await cache.get('page:/store')

    expect(updated?.html).toContain('v2')
    expect(updated?.storeSnapshot).toEqual({ cartCount: 2 })
  })
})

function handle<TData>(engine: PageMintEngine, page: RegisteredPage<TData>, path: string) {
  const request = new Request(`http://localhost${path}`)
  const match = matchPath(page.options.path, new URL(request.url).pathname)
  return engine.handlePage(page, createPageContext(request, match?.params))
}

function tick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

function createDeferred<T>(): {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (error: unknown) => void
} {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve
    reject = innerReject
  })

  return { promise, resolve, reject }
}
