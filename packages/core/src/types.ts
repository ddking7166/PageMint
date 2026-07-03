import type { Child } from 'hono/jsx'

export interface PageContext {
  request: Request
  params: Record<string, string>
  query: URLSearchParams
  pathname: string
}

export interface PageRenderContext<TData> extends PageContext {
  data: TData
}

export type PageCacheTagContext<TData> = PageRenderContext<TData>

export type PageRenderBody = Child | string

export interface PageRenderResponse {
  __pagemintResponse: true
  body: PageRenderBody
  status?: number
  headers?: Record<string, string>
}

export type PageRenderResult = PageRenderBody | PageRenderResponse

export interface DefinePageOptions<TData> {
  path: string
  load: (ctx: PageContext) => Promise<TData> | TData
  render: (ctx: PageRenderContext<TData>) => PageRenderResult | Promise<PageRenderResult>
  cache?: PageCacheOptions<TData>
}

export interface PageCacheOptions<TData> {
  ttl?: number
  staleTtl?: number
  key?: (ctx: PageContext) => string | Promise<string>
  hash?: (data: TData) => string | Promise<string>
  tags?: PageCacheTags<TData>
  revalidate?: 'on-request' | 'background' | 'manual'
}

export type PageCacheTag = string

export type PageCacheTags<TData> =
  | PageCacheTag[]
  | ((ctx: PageCacheTagContext<TData>) => PageCacheTag[] | Promise<PageCacheTag[]>)

export interface CacheEntry {
  html: string
  dataHash?: string
  createdAt: number
  updatedAt: number
  expireAt?: number
  staleAt?: number
  status?: number
  tags?: string[]
  headers?: Record<string, string>
}

export interface CacheStore {
  get(key: string): Promise<CacheEntry | null>
  set(key: string, entry: CacheEntry): Promise<void>
  delete(key: string): Promise<void>
  has?(key: string): Promise<boolean>
}

export interface RegisteredPage<TData = unknown> {
  id: string
  options: DefinePageOptions<TData>
}

export interface PageMintAppOptions {
  cache?: CacheStore
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
  data?: TData
  ttl?: number
  staleTtl?: number
  headers?: Record<string, string>
}

export interface RevalidateRebuildContext<TData = unknown> {
  key: string
  data?: TData
  hash?: string
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
