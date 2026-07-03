import { createCacheEntry, isFresh, refreshCacheEntry, canServeStale } from './cache.js'
import { PageMintError } from './errors.js'
import { createDataHash } from './hash.js'
import {
  clonePageContext,
  createPageContext,
  createSyntheticRequest,
  resolveCacheKey,
} from './key.js'
import { renderPageResult } from './renderer.js'
import { findMatchingPage } from './route.js'
import { PageMintRevalidator } from './revalidate.js'

import type {
  CacheEntry,
  DefinePageOptions,
  PageContext,
  PageMintAppOptions,
  PageMintErrorContext,
  PageResponse,
  RegisteredPage,
  Revalidator,
} from './types.js'

interface BuildTarget<TData = unknown> {
  page: RegisteredPage<TData>
  ctx: PageContext
}

export class PageMintEngine {
  readonly revalidator: Revalidator

  private readonly pages: RegisteredPage[] = []
  private readonly locks = new Map<string, Promise<CacheEntry>>()
  private readonly keyTargets = new Map<string, BuildTarget>()
  private readonly keyTags = new Map<string, Set<string>>()
  private readonly tagKeys = new Map<string, Set<string>>()
  private readonly now: () => number
  private readonly options: PageMintAppOptions

  constructor(options: PageMintAppOptions = {}) {
    this.options = options
    this.now = options.now ?? Date.now
    this.revalidator = new PageMintRevalidator({
      cache: options.cache,
      now: this.now,
      onError: options.onError,
    })
  }

  registerPage<TData>(options: DefinePageOptions<TData>): RegisteredPage<TData> {
    const page: RegisteredPage<TData> = {
      id: `${this.pages.length + 1}:${options.path}`,
      options,
    }

    this.pages.push(page as RegisteredPage)
    return page
  }

  listPages(): RegisteredPage[] {
    return [...this.pages]
  }

  async handlePage<TData>(page: RegisteredPage<TData>, ctx: PageContext): Promise<PageResponse> {
    if (!this.options.cache || !page.options.cache) {
      return this.renderWithoutCache(page, ctx)
    }

    const key = await resolveCacheKey(page.options, ctx)
    this.keyTargets.set(key, { page: page as RegisteredPage, ctx: clonePageContext(ctx) })

    let previousEntry: CacheEntry | null = null
    try {
      previousEntry = await this.options.cache.get(key)
      if (previousEntry?.tags) {
        this.indexTags(key, previousEntry.tags)
      }
    } catch (error) {
      throw this.wrapError('Failed to read cache entry', error, {
        phase: 'cache',
        cacheKey: key,
        pathname: ctx.pathname,
        pagePath: page.options.path,
      })
    }

    const now = this.now()
    if (previousEntry && isFresh(previousEntry, now)) {
      return this.toResponse(previousEntry, key, 'hit')
    }

    if (previousEntry && canServeStale(previousEntry, now)) {
      const mode = page.options.cache.revalidate ?? 'background'

      if (mode === 'manual') {
        return this.toResponse(previousEntry, key, 'stale')
      }

      if (mode === 'on-request') {
        const entry = await this.buildWithLock(key, page, ctx, previousEntry)
        return this.toResponse(entry, key, 'revalidated')
      }

      this.rebuildInBackground(key, page, ctx, previousEntry)
      return this.toResponse(previousEntry, key, 'stale')
    }

    const entry = await this.buildWithLock(key, page, ctx, previousEntry)
    return this.toResponse(entry, key, previousEntry ? 'revalidated' : 'miss')
  }

  async revalidate(pathOrUrl: string): Promise<CacheEntry | null> {
    const target = await this.targetFromPath(pathOrUrl)
    if (!target || !target.page.options.cache || !this.options.cache) {
      return null
    }

    const key = await resolveCacheKey(target.page.options, target.ctx)
    this.keyTargets.set(key, target)

    const previous = await this.options.cache.get(key)
    return this.buildWithLock(key, target.page, target.ctx, previous)
  }

  async revalidateTag(tag: string): Promise<CacheEntry[]> {
    if (!this.options.cache) {
      return []
    }

    const keys = this.tagKeys.get(normalizeTag(tag))
    if (!keys || keys.size === 0) {
      return []
    }

    const entries = await Promise.all(
      Array.from(keys).sort().map((key) => this.revalidateByKey(key)),
    )
    return entries.filter((entry): entry is CacheEntry => entry !== null)
  }

  async revalidateByKey(key: string): Promise<CacheEntry | null> {
    if (!this.options.cache) {
      return null
    }

    const target = this.keyTargets.get(key)
    if (!target) {
      throw new PageMintError(`No registered page context found for cache key "${key}"`, {
        phase: 'revalidate',
        cacheKey: key,
      })
    }

    const previous = await this.options.cache.get(key)
    return this.buildWithLock(key, target.page, target.ctx, previous)
  }

  async invalidate(pathOrUrl: string): Promise<void> {
    if (!this.options.cache) {
      return
    }

    const target = await this.targetFromPath(pathOrUrl)
    if (!target || !target.page.options.cache) {
      return
    }

    const key = await resolveCacheKey(target.page.options, target.ctx)
    await this.invalidateByKey(key)
  }

  async invalidateByKey(key: string): Promise<void> {
    await this.options.cache?.delete(key)
    this.unindexKey(key)
  }

  private async targetFromPath(pathOrUrl: string): Promise<BuildTarget | null> {
    const request = createSyntheticRequest(pathOrUrl)
    const url = new URL(request.url)
    const match = findMatchingPage(this.pages, url.pathname)

    if (!match) {
      return null
    }

    return {
      page: match.page,
      ctx: createPageContext(request, match.params),
    }
  }

  private async renderWithoutCache<TData>(
    page: RegisteredPage<TData>,
    ctx: PageContext,
  ): Promise<PageResponse> {
    const data = await page.options.load(ctx)
    const rendered = await renderPageResult(await page.options.render({ ...ctx, data }))
    return {
      html: rendered.html,
      status: rendered.status,
      headers: rendered.headers,
      cacheStatus: 'bypass',
    }
  }

  private rebuildInBackground<TData>(
    key: string,
    page: RegisteredPage<TData>,
    ctx: PageContext,
    previousEntry: CacheEntry,
  ): void {
    void this.buildWithLock(key, page, ctx, previousEntry).catch((error) => {
      this.options.onError?.(error, {
        phase: 'revalidate',
        cacheKey: key,
        pathname: ctx.pathname,
        pagePath: page.options.path,
      })
    })
  }

  private async buildWithLock<TData>(
    key: string,
    page: RegisteredPage<TData>,
    ctx: PageContext,
    previousEntry: CacheEntry | null,
  ): Promise<CacheEntry> {
    const existing = this.locks.get(key)
    if (existing) {
      return existing
    }

    const promise = this.buildEntry(key, page, ctx, previousEntry).finally(() => {
      this.locks.delete(key)
    })

    this.locks.set(key, promise)
    return promise
  }

  private async buildEntry<TData>(
    key: string,
    page: RegisteredPage<TData>,
    ctx: PageContext,
    previousEntry: CacheEntry | null,
  ): Promise<CacheEntry> {
    if (!this.options.cache) {
      throw new PageMintError('Cannot build a cache entry without a CacheStore', {
        phase: 'cache',
        cacheKey: key,
        pathname: ctx.pathname,
        pagePath: page.options.path,
      })
    }

    try {
      const data = await page.options.load(ctx)
      const dataHash = await this.hashData(page.options, data)
      const tags = await this.resolveTags(page.options, ctx, data)

      if (previousEntry?.dataHash && dataHash && previousEntry.dataHash === dataHash) {
        const refreshed = refreshCacheEntry(previousEntry, page.options.cache, this.now(), tags)
        await this.options.cache.set(key, refreshed)
        this.indexTags(key, refreshed.tags ?? [])
        return refreshed
      }

      const rendered = await renderPageResult(await page.options.render({ ...ctx, data }))
      const entry = createCacheEntry({
        html: rendered.html,
        dataHash,
        cache: page.options.cache,
        now: this.now(),
        status: rendered.status,
        tags,
        headers: rendered.headers,
        previous: previousEntry,
      })

      await this.options.cache.set(key, entry)
      this.indexTags(key, entry.tags ?? [])
      return entry
    } catch (error) {
      if (previousEntry) {
        this.options.onError?.(error, {
          phase: 'revalidate',
          cacheKey: key,
          pathname: ctx.pathname,
          pagePath: page.options.path,
        })
        return previousEntry
      }

      throw this.wrapError('Failed to build page HTML', error, {
        phase: 'render',
        cacheKey: key,
        pathname: ctx.pathname,
        pagePath: page.options.path,
      })
    }
  }

  private async hashData<TData>(
    page: DefinePageOptions<TData>,
    data: TData,
  ): Promise<string | undefined> {
    if (page.cache?.hash) {
      return page.cache.hash(data)
    }

    return createDataHash(data)
  }

  private async resolveTags<TData>(
    page: DefinePageOptions<TData>,
    ctx: PageContext,
    data: TData,
  ): Promise<string[] | undefined> {
    const tags = page.cache?.tags
    if (!tags) {
      return undefined
    }

    const resolved = typeof tags === 'function'
      ? await tags({ ...ctx, data })
      : tags

    return uniqueTags(resolved)
  }

  private indexTags(key: string, tags: string[]): void {
    this.unindexKey(key)
    const normalized = uniqueTags(tags)
    if (normalized.length === 0) {
      return
    }

    this.keyTags.set(key, new Set(normalized))
    for (const tag of normalized) {
      let keys = this.tagKeys.get(tag)
      if (!keys) {
        keys = new Set()
        this.tagKeys.set(tag, keys)
      }
      keys.add(key)
    }
  }

  private unindexKey(key: string): void {
    const tags = this.keyTags.get(key)
    if (!tags) {
      return
    }

    for (const tag of tags) {
      const keys = this.tagKeys.get(tag)
      keys?.delete(key)
      if (keys?.size === 0) {
        this.tagKeys.delete(tag)
      }
    }
    this.keyTags.delete(key)
  }

  private toResponse(
    entry: CacheEntry,
    key: string,
    cacheStatus: PageResponse['cacheStatus'],
  ): PageResponse {
    return {
      html: entry.html,
      status: entry.status ?? 200,
      headers: entry.headers ?? {},
      cacheKey: key,
      cacheStatus,
      entry,
    }
  }

  private wrapError(
    message: string,
    error: unknown,
    context: PageMintErrorContext,
  ): PageMintError {
    if (error instanceof PageMintError) {
      return error
    }

    return new PageMintError(message, context, error)
  }
}

function uniqueTags(tags: string[] | undefined): string[] {
  if (!tags) {
    return []
  }

  return Array.from(new Set(tags.map(normalizeTag).filter(Boolean))).sort()
}

function normalizeTag(tag: string): string {
  return tag.trim()
}
