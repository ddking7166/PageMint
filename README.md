# PageMint

PageMint is a lightweight server-side JSX framework built on Hono.

It turns data and JSX into cacheable HTML pages.

No React runtime.
No hydration by default.
No database lock-in.
No frontend/backend split required.

Perfect for content-heavy websites, internal tools, documentation sites, media indexes, and classic server-rendered applications.

## What PageMint Is

PageMint = Hono + Server JSX + Route HTML Cache + Revalidate Worker + data-action runtime.

Developers write pages as JSX components, load data on the server, render complete HTML strings, and cache that HTML by route key. Browser interactivity is handled with forms, `data-action`, and small plain JavaScript modules.

Client-side JavaScript is explicit. Use a client manifest to compose reusable browser modules and app-specific overrides without introducing default hydration.

The PC app builds browser assets explicitly too. It uses PageMint's config and Vite asset SDK APIs with Vite to bundle and minify client JavaScript, Tailwind CSS, existing PC CSS, and imported assets before TypeScript compilation.

PageMint is not a full Next.js replacement and does not try to clone React SSR. It does not ship a React runtime, does not hydrate pages by default, and does not assume a database, Redis, or any specific business domain.

## Good Fits

- Content-heavy sites and media indexes
- Documentation sites
- Internal tools and admin panels
- Small server-rendered applications
- LAN tools and dashboards

## Poor Fits

- Complex SPAs with heavy client-side state
- Large realtime collaborative editors
- Apps that require React hydration for most UI
- Figma-like canvases and browser-first editors

## Packages

- `@pagemint/core`: route cache engine, rendering, revalidation, adapter types
- `@pagemint/hono`: Hono app integration
- `@pagemint/cache-memory`: development and test cache adapter
- `@pagemint/cache-file`: file-system cache adapter
- `@pagemint/cache-redis`: Redis-like cache adapter without a hard Redis dependency
- `@pagemint/actions`: tiny `data-action` runtime and JSX helper
- `create-pagemint`: project generator

## Create A Project

```bash
npx create-pagemint my-app
cd my-app
pnpm install
pnpm dev
```

The generated app starts on:

```txt
http://localhost:3000
```

## Define A Page

```tsx
import { createPageMintApp, definePage } from '@pagemint/hono'
import { memoryCache } from '@pagemint/cache-memory'

const app = createPageMintApp({
  cache: memoryCache(),
})

app.page(
  definePage({
    path: '/',
    cache: {
      ttl: 60_000,
      key: ({ request }) => `page:${new URL(request.url).pathname}`,
    },
    async load() {
      return {
        title: 'PageMint',
        items: ['Hono', 'JSX', 'HTML Cache'],
      }
    },
    render({ data }) {
      return (
        <html>
          <head>
            <title>{data.title}</title>
          </head>
          <body>
            <h1>{data.title}</h1>
            <ul>
              {data.items.map((item) => (
                <li>{item}</li>
              ))}
            </ul>
          </body>
        </html>
      )
    },
  }),
)

export default app
```

## Dynamic Routes

```tsx
app.page(
  definePage({
    path: '/movies/:id',
    cache: {
      ttl: 5 * 60_000,
      key: ({ params }) => `page:movie:${params.id}`,
      hash: ({ movie }) => `${movie.id}:${movie.updatedAt}`,
    },
    async load({ params }) {
      const movie = await fetchMovie(params.id)
      return { movie }
    },
    render({ data }) {
      return <MovieDetailPage movie={data.movie} />
    },
  }),
)
```

## Cache Behavior

For cached pages, a request follows this path:

1. Match the Hono route and build `PageContext`.
2. Resolve the cache key from `cache.key` or the default route key.
3. Read `CacheStore`.
4. If the cached HTML is fresh, return it immediately.
5. If it is stale, return old HTML and revalidate in the background by default.
6. If it is missing or expired, rebuild synchronously.
7. For the same cache key, only one builder runs at a time.
8. If rebuild fails and old HTML exists, PageMint keeps serving the old HTML.

`ttl` controls freshness. `staleTtl` controls how long stale HTML may be served while PageMint rebuilds.

## Manual Revalidation

```ts
await app.revalidate('/movies/123')
await app.revalidateByKey('page:movie:123')
await app.revalidateTag('movie')
await app.invalidate('/movies/123')
await app.invalidateByKey('page:movie:123')
```

`revalidateByKey()` works after PageMint has seen a request or path revalidation for that key, because custom keys do not always map back to a route without context.

`revalidateTag()` rebuilds currently known cache keys registered through `cache.tags`.

## External Data Checks

```ts
app.revalidator.register({
  name: 'movie:123',
  interval: 5 * 60_000,
  async check() {
    const data = await fetchExternalMovie('123')
    return {
      key: 'page:movie:123',
      hash: createHash(data),
      data,
      ttl: 5 * 60_000,
    }
  },
  async rebuild({ data }) {
    return renderMoviePage(data)
  },
})

app.revalidator.start()
```

If the returned hash matches the cached entry, PageMint refreshes cache metadata and skips HTML rendering. If the hash changes, it renders new HTML and replaces the cache entry. If rendering fails, the old HTML stays in place.

## data-action

Server JSX:

```tsx
import { ActionButton } from '@pagemint/actions'

export function FavoriteButton({ movie }) {
  return (
    <ActionButton action="movie.favorite" payload={{ id: movie.id }}>
      Favorite
    </ActionButton>
  )
}
```

Browser runtime:

```ts
import { registerAction } from '@pagemint/actions/runtime'

registerAction('modal.open', ({ payload, el }) => {})
registerAction('modal.close', ({ payload, el }) => {})
registerAction('request.post', async ({ payload }) => {})
```

The runtime listens for clicks on `[data-action]`, parses `data-payload`, and calls registered handlers. It does not provide global state management or hydration.

## CacheStore Adapter

```ts
import type { CacheEntry, CacheStore } from '@pagemint/core'

export function customCache(): CacheStore {
  return {
    async get(key: string): Promise<CacheEntry | null> {
      return null
    },
    async set(key: string, entry: CacheEntry): Promise<void> {},
    async delete(key: string): Promise<void> {},
    async has(key: string): Promise<boolean> {
      return false
    },
  }
}
```

Adapters should treat `set()` as replacement, keep old entries untouched when a rebuild fails, and preserve the `CacheEntry` metadata fields.

## Node Deployment

Use Hono's Node server adapter:

```tsx
import { serve } from '@hono/node-server'
import app from './app.js'

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT ?? 3000),
})
```

Build and run:

```bash
pnpm build
node dist/app.js
```

## Local Development In This Repo

```bash
pnpm install
pnpm build
pnpm test
pnpm dev:basic
```

The basic example runs at `http://localhost:3000`.

## API Reference

See [docs/api.md](./docs/api.md) for every public API, parameter, return value, and type.

For app configuration, environment files, and reserved database/Redis settings, see [docs/config.md](./docs/config.md).

For browser interaction modules and script manifest configuration, see [docs/config.md#client-scripts](./docs/config.md#client-scripts).

For Node/Bun deployment notes and local runtime benchmark results, see [docs/deployment.md](./docs/deployment.md) and [docs/benchmarks.md](./docs/benchmarks.md).
