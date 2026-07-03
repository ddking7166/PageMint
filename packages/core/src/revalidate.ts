import { cacheEntryModelHash, createCacheEntry, refreshCacheEntry } from './cache.js'
import { renderPageResult } from './renderer.js'

import type {
  CacheEntry,
  CacheStore,
  PageMintErrorContext,
  RevalidateCheckResult,
  Revalidator,
  RevalidatorTask,
} from './types.js'
import type { PMStore } from './store.js'

export interface PageMintRevalidatorOptions {
  cache?: CacheStore
  store?: PMStore
  now: () => number
  onError?: (error: unknown, context: PageMintErrorContext) => void
}

export class PageMintRevalidator implements Revalidator {
  private readonly tasks = new Map<string, RevalidatorTask>()
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>()
  private readonly options: PageMintRevalidatorOptions
  private running = false

  constructor(options: PageMintRevalidatorOptions) {
    this.options = options
  }

  register<TData>(task: RevalidatorTask<TData>): void {
    if (task.interval <= 0) {
      throw new Error(`Revalidator task "${task.name}" must use a positive interval`)
    }

    this.unregister(task.name)
    this.tasks.set(task.name, task as RevalidatorTask)

    if (this.running) {
      this.startTask(task.name, task as RevalidatorTask)
    }
  }

  unregister(name: string): void {
    const timer = this.timers.get(name)
    if (timer) {
      clearInterval(timer)
      this.timers.delete(name)
    }
    this.tasks.delete(name)
  }

  start(): void {
    this.running = true
    for (const [name, task] of this.tasks) {
      this.startTask(name, task)
    }
  }

  stop(): void {
    this.running = false
    for (const timer of this.timers.values()) {
      clearInterval(timer)
    }
    this.timers.clear()
  }

  async run(name?: string): Promise<void> {
    if (name) {
      const task = this.tasks.get(name)
      if (!task) {
        throw new Error(`Unknown revalidator task "${name}"`)
      }
      await this.runTask(task)
      return
    }

    await Promise.all(Array.from(this.tasks.values()).map((task) => this.runTask(task)))
  }

  list(): string[] {
    return Array.from(this.tasks.keys())
  }

  private startTask(name: string, task: RevalidatorTask): void {
    if (this.timers.has(name)) {
      return
    }

    const timer = setInterval(() => {
      void this.runTask(task)
    }, task.interval)

    this.timers.set(name, timer)
  }

  private async runTask(task: RevalidatorTask): Promise<void> {
    const cache = this.options.cache
    if (!cache) {
      return
    }

    try {
      const result = await task.check()
      const previousEntry = await cache.get(result.key)
      const modelHash = result.modelHash ?? result.hash
      const previousHash = cacheEntryModelHash(previousEntry)

      if (previousEntry && previousHash && modelHash && previousHash === modelHash) {
        await cache.set(
          result.key,
          refreshExternalEntry(
            {
              ...previousEntry,
              storeSnapshot: this.options.store?.snapshot(),
            },
            result,
            this.options.now(),
          ),
        )
        return
      }

      const rendered = await task.rebuild({
        key: result.key,
        data: result.data,
        hash: result.hash,
        modelHash,
        previousEntry,
      })
      const pageResult = await renderPageResult(rendered)
      const entry = createCacheEntry({
        html: pageResult.html,
        modelHash,
        storeSnapshot: this.options.store?.snapshot(),
        cache: { ttl: result.ttl, staleTtl: result.staleTtl },
        now: this.options.now(),
        status: pageResult.status,
        headers: {
          ...result.headers,
          ...pageResult.headers,
        },
        previous: previousEntry,
      })

      await cache.set(result.key, entry)
    } catch (error) {
      this.options.onError?.(error, {
        phase: 'revalidate',
        pagePath: task.name,
      })
    }
  }
}

function refreshExternalEntry(
  entry: CacheEntry,
  result: RevalidateCheckResult,
  now: number,
): CacheEntry {
  return refreshCacheEntry(entry, { ttl: result.ttl, staleTtl: result.staleTtl }, now)
}
