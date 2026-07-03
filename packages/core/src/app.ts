import {
  cacheEntryModelHash,
  canServeStale,
  createCacheEntry,
  isFresh,
  refreshCacheEntry,
} from './cache.js'
import { DependencyGraph, normalizeDependencyId } from './dependency.js'
import { PageMintError } from './errors.js'
import { createDataHash } from './hash.js'
import {
  clonePageContext,
  createPageContext,
  createSyntheticRequest,
  resolveCacheKey,
} from './key.js'
import { postProcessHtml, renderPageResult } from './renderer.js'
import { findMatchingPage } from './route.js'
import { PageMintRevalidator } from './revalidate.js'
import { SingleFlight } from './singleflight.js'
import { withPMStore } from './store.js'

import type {
  CacheEntry,
  DefinePageOptions,
  PageContext,
  PageDependency,
  PageMintAppOptions,
  PageMintErrorContext,
  PageResponse,
  RegisteredPage,
  Revalidator,
} from './types.js'

interface BuildTarget<TRawData = unknown, TModel = TRawData> {
  page: RegisteredPage<TRawData, TModel>
  ctx: PageContext
}

interface NormalizedDependencies {
  ids: string[]
  edges: Array<{ source: string; target: string }>
}

export class PageMintEngine {
  readonly revalidator: Revalidator
  readonly dependencyGraph = new DependencyGraph()

  private readonly pages: RegisteredPage[] = []
  private readonly builders = new SingleFlight()
  private readonly keyTargets = new Map<string, BuildTarget>()
  private readonly keyTags = new Map<string, Set<string>>()
  private readonly tagKeys = new Map<string, Set<string>>()
  private readonly keyDependencies = new Map<string, Set<string>>()
  private readonly dependencyKeys = new Map<string, Set<string>>()
  private readonly now: () => number
  private readonly options: PageMintAppOptions
  private suppressStoreRevalidation = 0

  constructor(options: PageMintAppOptions = {}) {
    this.options = options
    this.now = options.now ?? Date.now
    this.revalidator = new PageMintRevalidator({
      cache: options.cache,
      store: options.store,
      now: this.now,
      onError: options.onError,
    })
    this.bindStoreRevalidation()
  }

  registerPage<TRawData, TModel = TRawData>(
    options: DefinePageOptions<TRawData, TModel>,
  ): RegisteredPage<TRawData, TModel> {
    const page: RegisteredPage<TRawData, TModel> = {
      id: `${this.pages.length + 1}:${options.path}`,
      options,
    }

    this.pages.push(page as RegisteredPage)
    return page
  }

  listPages(): RegisteredPage[] {
    return [...this.pages]
  }

  async handlePage<TRawData, TModel = TRawData>(
    page: RegisteredPage<TRawData, TModel>,
    ctx: PageContext,
  ): Promise<PageResponse> {
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
      if (previousEntry?.dependencies) {
        this.indexDependencies(key, { ids: previousEntry.dependencies, edges: [] })
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

  async invalidateTag(tag: string): Promise<CacheEntry[]> {
    return this.revalidateTag(tag)
  }

  addDependency(source: string, target: string): this {
    this.dependencyGraph.add(source, target)
    return this
  }

  addDependencies(edges: Array<{ source: string; target: string }>): this {
    this.dependencyGraph.addMany(edges)
    return this
  }

  async revalidateDependency(dependency: string): Promise<CacheEntry[]> {
    if (!this.options.cache) {
      return []
    }

    const dependencyIds = this.dependencyGraph.resolve(dependency)
    const keys = new Set<string>()

    for (const dependencyId of dependencyIds) {
      for (const key of this.dependencyKeys.get(dependencyId) ?? []) {
        keys.add(key)
      }
    }

    const entries = await Promise.all(
      Array.from(keys).sort().map((key) => this.revalidateByKey(key)),
    )
    return entries.filter((entry): entry is CacheEntry => entry !== null)
  }

  async invalidateDependency(dependency: string): Promise<CacheEntry[]> {
    return this.revalidateDependency(dependency)
  }

  async revalidateStore(scope: string): Promise<CacheEntry[]> {
    if (!this.options.cache) {
      return []
    }

    const normalizedScope = normalizeTag(scope)
    if (!normalizedScope) {
      return []
    }

    const keys = new Set<string>()
    for (const key of this.tagKeys.get(normalizedScope) ?? []) {
      keys.add(key)
    }

    for (const dependencyId of this.dependencyGraph.resolve(normalizedScope)) {
      for (const key of this.dependencyKeys.get(dependencyId) ?? []) {
        keys.add(key)
      }
    }

    const entries = await Promise.all(
      Array.from(keys).sort().map((key) => this.revalidateByKey(key)),
    )
    return entries.filter((entry): entry is CacheEntry => entry !== null)
  }

  async invalidateStore(scope: string): Promise<CacheEntry[]> {
    return this.revalidateStore(scope)
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

  private async renderWithoutCache<TRawData, TModel = TRawData>(
    page: RegisteredPage<TRawData, TModel>,
    ctx: PageContext,
  ): Promise<PageResponse> {
    const raw = await page.options.load(ctx)
    const model = await this.normalizeModel(page.options, raw, ctx)
    const renderContext = { ...ctx, data: model, model, store: this.options.store }
    const rendered = await withPMStore(
      this.options.store,
      async () => renderPageResult(
        await page.options.render(renderContext),
        { islands: false },
      ),
    )
    const html = await this.postProcessPageHtml(page.options, rendered.html, renderContext)

    return {
      html,
      status: rendered.status,
      headers: rendered.headers,
      cacheStatus: 'bypass',
    }
  }

  private rebuildInBackground<TRawData, TModel = TRawData>(
    key: string,
    page: RegisteredPage<TRawData, TModel>,
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

  private async buildWithLock<TRawData, TModel = TRawData>(
    key: string,
    page: RegisteredPage<TRawData, TModel>,
    ctx: PageContext,
    previousEntry: CacheEntry | null,
  ): Promise<CacheEntry> {
    return this.builders.do(key, () => this.buildEntry(key, page, ctx, previousEntry))
  }

  private async buildEntry<TRawData, TModel = TRawData>(
    key: string,
    page: RegisteredPage<TRawData, TModel>,
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
    const cache = this.options.cache

    try {
      return await this.withSuppressedStoreRevalidation(async () => {
        const raw = await page.options.load(ctx)
        const model = await this.normalizeModel(page.options, raw, ctx)
        const modelHash = await this.hashModel(page.options, model)
        const renderContext = { ...ctx, data: model, model, store: this.options.store }
        const tags = await this.resolveTags(page.options, renderContext)
        const dependencies = await this.resolveDependencies(page.options, renderContext)
        const previousHash = cacheEntryModelHash(previousEntry)
        const storeSnapshot = this.snapshotStore()

        if (previousEntry && previousHash && modelHash && previousHash === modelHash) {
          const refreshed = refreshCacheEntry(
            {
              ...previousEntry,
              storeSnapshot,
            },
            page.options.cache,
            this.now(),
            tags,
            dependencies.ids,
          )
          await cache.set(key, refreshed)
          this.indexTags(key, refreshed.tags ?? [])
          this.indexDependencies(key, dependencies)
          return refreshed
        }

        const rendered = await withPMStore(
          this.options.store,
          async () => renderPageResult(
            await page.options.render(renderContext),
            { islands: false },
          ),
        )
        const html = await this.postProcessPageHtml(page.options, rendered.html, renderContext)
        const entry = createCacheEntry({
          html,
          modelHash,
          storeSnapshot: this.snapshotStore(),
          cache: page.options.cache,
          now: this.now(),
          status: rendered.status,
          tags,
          dependencies: dependencies.ids,
          headers: rendered.headers,
          previous: previousEntry,
        })

        await cache.set(key, entry)
        this.indexTags(key, entry.tags ?? [])
        this.indexDependencies(key, dependencies)
        return entry
      })
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

  private async normalizeModel<TRawData, TModel>(
    page: DefinePageOptions<TRawData, TModel>,
    raw: TRawData,
    ctx: PageContext,
  ): Promise<TModel> {
    if (page.normalize) {
      return page.normalize(raw, { ...ctx, raw })
    }

    return raw as unknown as TModel
  }

  private async hashModel<TRawData, TModel>(
    page: DefinePageOptions<TRawData, TModel>,
    model: TModel,
  ): Promise<string | undefined> {
    if (page.cache?.modelHash) {
      return page.cache.modelHash(model)
    }

    if (page.cache?.hash) {
      return page.cache.hash(model)
    }

    return createDataHash(model)
  }

  private async postProcessPageHtml<TRawData, TModel>(
    page: DefinePageOptions<TRawData, TModel>,
    html: string,
    ctx: PageContext & { data: TModel; model: TModel; store?: PageMintAppOptions['store'] },
  ): Promise<string> {
    const userProcessed = page.postProcess ? await page.postProcess(html, ctx) : html
    return postProcessHtml(userProcessed, {
      islands: this.options.store ? { store: this.options.store } : undefined,
    })
  }

  private async resolveTags<TRawData, TModel>(
    page: DefinePageOptions<TRawData, TModel>,
    ctx: PageContext & { data: TModel; model: TModel },
  ): Promise<string[] | undefined> {
    const tags = page.cache?.tags
    if (!tags) {
      return undefined
    }

    const resolved = typeof tags === 'function'
      ? await tags(ctx)
      : tags

    return uniqueTags(resolved)
  }

  private async resolveDependencies<TRawData, TModel>(
    page: DefinePageOptions<TRawData, TModel>,
    ctx: PageContext & { data: TModel; model: TModel },
  ): Promise<NormalizedDependencies> {
    const dependencies = page.dependencies
    if (!dependencies) {
      return { ids: [], edges: [] }
    }

    const resolved = typeof dependencies === 'function'
      ? await dependencies(ctx)
      : dependencies

    return normalizeDependencies(resolved)
  }

  private indexTags(key: string, tags: string[]): void {
    this.unindexTags(key)
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
    this.unindexTags(key)
    this.unindexDependencies(key)
  }

  private unindexTags(key: string): void {
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

  private indexDependencies(key: string, dependencies: NormalizedDependencies): void {
    this.unindexDependencies(key)
    this.dependencyGraph.addMany(dependencies.edges)

    if (dependencies.ids.length === 0) {
      return
    }

    this.keyDependencies.set(key, new Set(dependencies.ids))
    for (const dependency of dependencies.ids) {
      let keys = this.dependencyKeys.get(dependency)
      if (!keys) {
        keys = new Set()
        this.dependencyKeys.set(dependency, keys)
      }
      keys.add(key)
    }
  }

  private unindexDependencies(key: string): void {
    const dependencies = this.keyDependencies.get(key)
    if (!dependencies) {
      return
    }

    for (const dependency of dependencies) {
      const keys = this.dependencyKeys.get(dependency)
      keys?.delete(key)
      if (keys?.size === 0) {
        this.dependencyKeys.delete(dependency)
      }
    }
    this.keyDependencies.delete(key)
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

  private bindStoreRevalidation(): void {
    const store = this.options.store
    if (!store) {
      return
    }

    const revalidate = (payload: unknown) => {
      if (this.suppressStoreRevalidation > 0) {
        return
      }

      const scope = normalizeStoreScope(payload)
      if (!scope) {
        return
      }

      void this.revalidateStore(scope).catch((error) => {
        this.options.onError?.(error, {
          phase: 'revalidate',
        })
      })
    }

    store.on('store:invalidate', revalidate)
    store.on('store:patch', revalidate)
  }

  private async withSuppressedStoreRevalidation<T>(run: () => Promise<T>): Promise<T> {
    this.suppressStoreRevalidation += 1
    try {
      return await run()
    } finally {
      this.suppressStoreRevalidation -= 1
    }
  }

  private snapshotStore(): CacheEntry['storeSnapshot'] {
    return this.options.store?.snapshot()
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

function normalizeStoreScope(payload: unknown): string | null {
  if (typeof payload === 'string') {
    return normalizeTag(payload) || null
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'scope' in payload &&
    typeof (payload as { scope?: unknown }).scope === 'string'
  ) {
    return normalizeTag((payload as { scope: string }).scope) || null
  }

  return null
}

function normalizeDependencies(dependencies: PageDependency[]): NormalizedDependencies {
  const ids = new Set<string>()
  const edges: Array<{ source: string; target: string }> = []

  for (const dependency of dependencies) {
    if (typeof dependency === 'string') {
      const id = normalizeDependencyId(dependency)
      if (id) ids.add(id)
      continue
    }

    const id = normalizeDependencyId(dependency.id)
    if (!id) {
      continue
    }

    ids.add(id)
    const affected = Array.isArray(dependency.affects)
      ? dependency.affects
      : dependency.affects
        ? [dependency.affects]
        : []

    for (const target of affected) {
      const normalizedTarget = normalizeDependencyId(target)
      if (normalizedTarget) {
        edges.push({ source: id, target: normalizedTarget })
      }
    }
  }

  return {
    ids: Array.from(ids).sort(),
    edges,
  }
}
