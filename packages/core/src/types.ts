import type { Child } from 'hono/jsx'
import type { PMStore, PMStoreSnapshot } from './store.js'

export type CacheKeyPart = string | number | boolean | null | undefined

export type CacheKeyContext = Record<string, CacheKeyPart>

export interface PageContext {
  request: Request
  params: Record<string, string>
  query: URLSearchParams
  pathname: string
  cacheContext?: CacheKeyContext
}

export interface PageNormalizeContext<TRawData> extends PageContext {
  raw: TRawData
}

export interface PageRenderContext<TModel> extends PageContext {
  data: TModel
  model: TModel
  store?: PMStore
}

export type PagePostProcessContext<TModel> = PageRenderContext<TModel>

export type PageCacheTagContext<TModel> = PageRenderContext<TModel>

export type PageRenderBody = Child | string

export interface PageRenderResponse {
  __pagemintResponse: true
  body: PageRenderBody
  status?: number
  headers?: Record<string, string>
}

export type PageRenderResult = PageRenderBody | PageRenderResponse

export interface DefinePageOptions<TRawData, TModel = TRawData> {
  path: string
  load: (ctx: PageContext) => Promise<TRawData> | TRawData
  normalize?: (
    raw: TRawData,
    ctx: PageNormalizeContext<TRawData>,
  ) => Promise<TModel> | TModel
  render: (ctx: PageRenderContext<TModel>) => PageRenderResult | Promise<PageRenderResult>
  postProcess?: (
    html: string,
    ctx: PagePostProcessContext<TModel>,
  ) => Promise<string> | string
  cache?: PageCacheOptions<TModel>
  dependencies?: PageDependencies<TModel>
}

export interface PageCacheOptions<TModel> {
  ttl?: number
  staleTtl?: number
  key?: (ctx: PageContext) => string | Promise<string>
  hash?: (model: TModel) => string | Promise<string>
  modelHash?: (model: TModel) => string | Promise<string>
  tags?: PageCacheTags<TModel>
  revalidate?: 'on-request' | 'background' | 'manual'
}

export type PageCacheTag = string

export type PageCacheTags<TModel> =
  | PageCacheTag[]
  | ((ctx: PageCacheTagContext<TModel>) => PageCacheTag[] | Promise<PageCacheTag[]>)

export type PageDependency =
  | string
  | {
    id: string
    affects?: string | string[]
  }

export type PageDependencies<TModel> =
  | PageDependency[]
  | ((ctx: PageRenderContext<TModel>) => PageDependency[] | Promise<PageDependency[]>)

export interface CacheEntry {
  html: string
  modelHash?: string
  dataHash?: string
  storeSnapshot?: PMStoreSnapshot
  createdAt: number
  updatedAt: number
  expireAt?: number
  staleAt?: number
  status?: number
  tags?: string[]
  dependencies?: string[]
  headers?: Record<string, string>
}

export interface CacheStore {
  get(key: string): Promise<CacheEntry | null>
  set(key: string, entry: CacheEntry): Promise<void>
  delete(key: string): Promise<void>
  has?(key: string): Promise<boolean>
}

export interface RegisteredPage<TRawData = unknown, TModel = TRawData> {
  id: string
  options: DefinePageOptions<TRawData, TModel>
}

export interface PageMintAppOptions {
  cache?: CacheStore
  store?: PMStore
  now?: () => number
  onError?: (error: unknown, context: PageMintErrorContext) => void
}

export interface PageMintErrorContext {
  cacheKey?: string
  pathname?: string
  pagePath?: string
  phase: 'load' | 'render' | 'cache' | 'revalidate' | 'route'
}

export type PageCacheStatus = 'bypass' | 'hit' | 'miss' | 'stale' | 'revalidated'

export interface PageResponse {
  html: string
  status: number
  headers: Record<string, string>
  cacheKey?: string
  cacheStatus: PageCacheStatus
  entry?: CacheEntry
}

export interface RevalidateCheckResult<TData = unknown> {
  key: string
  hash?: string
  modelHash?: string
  data?: TData
  ttl?: number
  staleTtl?: number
  headers?: Record<string, string>
}

export interface RevalidateRebuildContext<TData = unknown> {
  key: string
  data?: TData
  hash?: string
  modelHash?: string
  previousEntry: CacheEntry | null
}

export interface RevalidatorTask<TData = unknown> {
  name: string
  interval: number
  check: () => Promise<RevalidateCheckResult<TData>> | RevalidateCheckResult<TData>
  rebuild: (ctx: RevalidateRebuildContext<TData>) => Promise<PageRenderResult> | PageRenderResult
}

export interface Revalidator {
  register<TData>(task: RevalidatorTask<TData>): void
  unregister(name: string): void
  start(): void
  stop(): void
  run(name?: string): Promise<void>
  list(): string[]
}
