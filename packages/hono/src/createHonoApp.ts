import { PageMintEngine, createPageContext, definePage, matchPath } from '@pagemint/core'
import { Hono } from 'hono'

import type {
  CacheEntry,
  DefinePageOptions,
  PageMintAppOptions,
  RegisteredPage,
  Revalidator,
} from '@pagemint/core'

export interface PageMintHonoApp extends Hono {
  page<TData>(page: DefinePageOptions<TData>): PageMintHonoApp
  revalidate(pathOrUrl: string): Promise<CacheEntry | null>
  revalidateByKey(key: string): Promise<CacheEntry | null>
  revalidateTag(tag: string): Promise<CacheEntry[]>
  invalidate(pathOrUrl: string): Promise<void>
  invalidateByKey(key: string): Promise<void>
  revalidator: Revalidator
  engine: PageMintEngine
}

export type CreatePageMintAppOptions = PageMintAppOptions

export function createPageMintApp(options: CreatePageMintAppOptions = {}): PageMintHonoApp {
  const hono = new Hono()
  const engine = new PageMintEngine(options)
  const app = hono as PageMintHonoApp

  app.engine = engine
  app.revalidator = engine.revalidator

  app.page = <TData>(pageOptions: DefinePageOptions<TData>): PageMintHonoApp => {
    const page = engine.registerPage(pageOptions)

    hono.get(toHonoPath(pageOptions.path), async (c) => {
      const match = matchPath(pageOptions.path, new URL(c.req.raw.url).pathname)
      const ctx = createPageContext(c.req.raw, match?.params ?? {})
      const response = await engine.handlePage(page as RegisteredPage<TData>, ctx)
      const headers = new Headers(response.headers)

      if (!headers.has('content-type') && (response.status < 300 || response.status >= 400)) {
        headers.set('content-type', 'text/html; charset=UTF-8')
      }
      headers.set('x-pagemint-cache', response.cacheStatus)
      if (response.cacheKey) {
        headers.set('x-pagemint-cache-key', response.cacheKey)
      }

      return new Response(response.html, {
        status: response.status,
        headers,
      })
    })

    return app
  }

  app.revalidate = (pathOrUrl) => engine.revalidate(pathOrUrl)
  app.revalidateByKey = (key) => engine.revalidateByKey(key)
  app.revalidateTag = (tag) => engine.revalidateTag(tag)
  app.invalidate = (pathOrUrl) => engine.invalidate(pathOrUrl)
  app.invalidateByKey = (key) => engine.invalidateByKey(key)

  return app
}

export { definePage }

function toHonoPath(path: string): string {
  return path.replace(/\/:[^/]+\*$/, '/*')
}
