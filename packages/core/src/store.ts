import { AsyncLocalStorage } from 'node:async_hooks'

export type PMStoreState = Record<string, unknown>

export type PMStoreSnapshot<TState extends object = PMStoreState> = TState

export type PMStoreEventHandler<TPayload = unknown> = (payload: TPayload) => void

export type PMStoreSubscriber<TState extends object = PMStoreState> = (
  state: TState,
  change: PMStoreChange,
) => void

export type PMStoreWatcher<TValue> = (
  value: TValue,
  previousValue: TValue | undefined,
  change: PMStoreChange,
) => void

export interface PMStoreChange {
  type: 'init' | 'set' | 'delete' | 'batch' | 'patch' | 'invalidate'
  paths: string[]
  path?: string
  scope?: string
  value?: unknown
  previousValue?: unknown
}

export interface PMStoreWatchOptions {
  immediate?: boolean
}

export interface PMActionContext<TState extends object = PMStoreState> {
  store: PMStore<TState>
  state: TState
  event?: Event
  el?: Element
  payload?: unknown
}

export type PMAction<TState extends object = PMStoreState> = (
  store: PMStore<TState>,
  context?: PMActionContext<TState>,
  ...args: unknown[]
) => unknown

export type PMActionTree<TState extends object = PMStoreState> = {
  [key: string]: PMAction<TState> | PMActionTree<TState>
}

export type BoundPMActionTree = {
  [key: string]: ((context?: PMActionContext, ...args: unknown[]) => unknown) | BoundPMActionTree
}

export interface CreateStoreOptions<
  TState extends object = PMStoreState,
  TActions extends PMActionTree<TState> = PMActionTree<TState>,
> {
  state: TState
  actions?: TActions
}

export interface CreatePMStoreOptions<TState extends object = PMStoreState> {
  actions?: PMActionTree<TState>
}

export interface PMStore<TState extends object = PMStoreState> {
  readonly state: TState
  readonly actions: BoundPMActionTree
  subscribe(fn: PMStoreSubscriber<TState>): () => void
  watch<TValue>(
    selector: () => TValue,
    fn: PMStoreWatcher<TValue>,
    options?: PMStoreWatchOptions,
  ): () => void
  setState(partial: Partial<TState>): void
  patch(scope: string, value?: unknown): void
  patch(partial: Partial<TState>): void
  invalidate(scope: string): void
  snapshot(): PMStoreSnapshot<TState>
  batch(fn: () => void): void
  on<TPayload = unknown>(event: string, handler: PMStoreEventHandler<TPayload>): () => void
  off<TPayload = unknown>(event: string, handler: PMStoreEventHandler<TPayload>): void
  emit<TPayload = unknown>(event: string, payload?: TPayload): void
  registerActions(actions: PMActionTree<TState>): void
}

interface WatchRecord<TValue = unknown> {
  selector: () => TValue
  fn: PMStoreWatcher<TValue>
  deps: Set<string>
  value: TValue
}

interface DependencyCollector {
  store?: PMStoreImpl<object>
  deps: Set<string>
}

interface PendingChange {
  type: PMStoreChange['type']
  path?: string
  scope?: string
  value?: unknown
  previousValue?: unknown
}

const proxyToRaw = new WeakMap<object, object>()
const storeScope = new AsyncLocalStorage<PMStore<object>>()
let activeCollector: DependencyCollector | null = null

export function createPMStore<TState extends object>(
  initialState: TState,
  options: CreatePMStoreOptions<TState> = {},
): PMStore<TState> {
  return new PMStoreImpl(initialState, options.actions)
}

export function createStore<
  TState extends object,
  TActions extends PMActionTree<TState> = PMActionTree<TState>,
>(options: CreateStoreOptions<TState, TActions>): PMStore<TState> {
  return createPMStore(options.state, { actions: options.actions })
}

export function usePMStore<TState extends object = PMStoreState>(): PMStore<TState> {
  const store = storeScope.getStore()
  if (!store) {
    throw new Error('usePMStore() must be called while a PageMint store is active')
  }

  return store as PMStore<TState>
}

export function withPMStore<TState extends object, TResult>(
  store: PMStore<TState> | undefined,
  run: () => TResult,
): TResult {
  if (!store) {
    return run()
  }

  return storeScope.run(store as PMStore<object>, run)
}

export function watch<TValue>(
  selector: () => TValue,
  fn: PMStoreWatcher<TValue>,
  options?: PMStoreWatchOptions,
): () => void {
  const collected = collectDependencies(selector)
  if (!collected.store) {
    throw new Error('watch() selector must read from a PageMint store')
  }

  return collected.store.watch(selector, fn, options)
}

class PMStoreImpl<TState extends object> implements PMStore<TState> {
  readonly state: TState
  readonly actions: BoundPMActionTree = {}

  private readonly rawState: TState
  private readonly rawToProxy = new WeakMap<object, object>()
  private readonly subscribers = new Set<PMStoreSubscriber<TState>>()
  private readonly watchers = new Set<WatchRecord>()
  private readonly events = new Map<string, Set<PMStoreEventHandler>>()
  private readonly pending: PendingChange[] = []
  private batchDepth = 0
  private scheduled = false

  constructor(initialState: TState, actions?: PMActionTree<TState>) {
    this.rawState = toRaw(initialState) as TState
    this.state = this.reactive(this.rawState, '') as TState

    if (actions) {
      this.registerActions(actions)
    }
  }

  subscribe(fn: PMStoreSubscriber<TState>): () => void {
    this.subscribers.add(fn)
    fn(this.state, { type: 'init', paths: [] })

    return () => {
      this.subscribers.delete(fn)
    }
  }

  watch<TValue>(
    selector: () => TValue,
    fn: PMStoreWatcher<TValue>,
    options: PMStoreWatchOptions = {},
  ): () => void {
    const collected = this.collect(selector)
    const record: WatchRecord<TValue> = {
      selector,
      fn,
      deps: collected.deps,
      value: collected.value,
    }

    this.watchers.add(record as WatchRecord)
    if (options.immediate ?? true) {
      fn(collected.value, undefined, { type: 'init', paths: [] })
    }

    return () => {
      this.watchers.delete(record as WatchRecord)
    }
  }

  setState(partial: Partial<TState>): void {
    this.batch(() => {
      for (const [key, value] of Object.entries(partial)) {
        Reflect.set(this.state as Record<string, unknown>, key, value)
      }
    })
  }

  patch(scopeOrPartial: string | Partial<TState>, value?: unknown): void {
    if (typeof scopeOrPartial !== 'string') {
      this.setState(scopeOrPartial)
      this.emit('store:patch', { scope: undefined, value: scopeOrPartial })
      return
    }

    const scope = scopeOrPartial.trim()
    if (!scope) {
      return
    }

    if (arguments.length >= 2) {
      setPath(this.state as Record<string, unknown>, scope, value)
    }

    this.queueChange({
      type: 'patch',
      path: scope,
      scope,
      value,
    })
    this.emit('store:patch', { scope, value })
  }

  invalidate(scope: string): void {
    const normalized = scope.trim()
    if (!normalized) {
      return
    }

    this.queueChange({
      type: 'invalidate',
      path: normalized,
      scope: normalized,
    })
    this.emit('store:invalidate', { scope: normalized })
  }

  snapshot(): PMStoreSnapshot<TState> {
    return cloneSnapshot(this.rawState) as PMStoreSnapshot<TState>
  }

  batch(fn: () => void): void {
    this.batchDepth += 1
    try {
      fn()
    } finally {
      this.batchDepth -= 1
      if (this.batchDepth === 0) {
        this.scheduleFlush()
      }
    }
  }

  on<TPayload = unknown>(event: string, handler: PMStoreEventHandler<TPayload>): () => void {
    let handlers = this.events.get(event)
    if (!handlers) {
      handlers = new Set()
      this.events.set(event, handlers)
    }
    handlers.add(handler as PMStoreEventHandler)

    return () => {
      this.off(event, handler)
    }
  }

  off<TPayload = unknown>(event: string, handler: PMStoreEventHandler<TPayload>): void {
    const handlers = this.events.get(event)
    handlers?.delete(handler as PMStoreEventHandler)
    if (handlers?.size === 0) {
      this.events.delete(event)
    }
  }

  emit<TPayload = unknown>(event: string, payload?: TPayload): void {
    for (const handler of this.events.get(event) ?? []) {
      handler(payload)
    }
  }

  registerActions(actions: PMActionTree<TState>): void {
    mergeActions(this.actions, actions, this)
  }

  private reactive(target: object, basePath: string): object {
    const rawTarget = toRaw(target)
    const existing = this.rawToProxy.get(rawTarget)
    if (existing) {
      return existing
    }

    const proxy = new Proxy(rawTarget, {
      get: (current, key, receiver) => {
        if (key === '__pagemintRaw') {
          return current
        }

        const value = Reflect.get(current, key, receiver)
        if (typeof key === 'symbol') {
          return this.wrapChild(value, basePath)
        }

        const path = joinPath(basePath, key)
        this.track(path)
        return this.wrapChild(value, path)
      },

      set: (current, key, nextValue, receiver) => {
        if (typeof key === 'symbol') {
          return Reflect.set(current, key, nextValue, receiver)
        }

        const path = joinPath(basePath, key)
        const previousValue = Reflect.get(current, key, receiver)
        const rawNextValue = toRaw(nextValue)
        if (Object.is(previousValue, rawNextValue)) {
          return true
        }

        const didSet = Reflect.set(current, key, rawNextValue, receiver)
        if (didSet) {
          this.queueChange({
            type: 'set',
            path,
            value: rawNextValue,
            previousValue,
          })
        }

        return didSet
      },

      deleteProperty: (current, key) => {
        if (typeof key === 'symbol') {
          return Reflect.deleteProperty(current, key)
        }

        if (!Reflect.has(current, key)) {
          return true
        }

        const path = joinPath(basePath, key)
        const previousValue = Reflect.get(current, key)
        const didDelete = Reflect.deleteProperty(current, key)
        if (didDelete) {
          this.queueChange({
            type: 'delete',
            path,
            previousValue,
          })
        }

        return didDelete
      },
    })

    this.rawToProxy.set(rawTarget, proxy)
    proxyToRaw.set(proxy, rawTarget)
    return proxy
  }

  private wrapChild(value: unknown, path: string): unknown {
    if (value === null || typeof value !== 'object') {
      return value
    }

    return this.reactive(value, path)
  }

  private track(path: string): void {
    if (!activeCollector || !path) {
      return
    }

    activeCollector.store = this as unknown as PMStoreImpl<object>
    activeCollector.deps.add(path)
  }

  private collect<TValue>(selector: () => TValue): { value: TValue; deps: Set<string> } {
    const collected = collectDependencies(selector)
    if (collected.store && collected.store !== (this as unknown as PMStoreImpl<object>)) {
      throw new Error('PageMint store watch selectors cannot read from multiple stores')
    }

    return {
      value: collected.value,
      deps: collected.deps,
    }
  }

  private queueChange(change: PendingChange): void {
    this.pending.push(change)
    if (this.batchDepth === 0) {
      this.scheduleFlush()
    }
  }

  private scheduleFlush(): void {
    if (this.scheduled || this.pending.length === 0 || this.batchDepth > 0) {
      return
    }

    this.scheduled = true
    queueMicrotask(() => {
      this.scheduled = false
      this.flush()
    })
  }

  private flush(): void {
    if (this.pending.length === 0) {
      return
    }

    const pending = this.pending.splice(0)
    const change = toStoreChange(pending)

    for (const subscriber of this.subscribers) {
      subscriber(this.state, change)
    }

    for (const record of this.watchers) {
      if (!watchTouched(record.deps, change.paths)) {
        continue
      }

      const previousValue = record.value
      const collected = this.collect(record.selector)
      record.deps = collected.deps
      record.value = collected.value
      record.fn(collected.value, previousValue, change)
    }
  }
}

function collectDependencies<TValue>(
  selector: () => TValue,
): DependencyCollector & { value: TValue } {
  const previous = activeCollector
  const collector: DependencyCollector = { deps: new Set() }

  activeCollector = collector
  try {
    const value = selector()
    return {
      ...collector,
      value,
    }
  } finally {
    activeCollector = previous
  }
}

function mergeActions<TState extends object>(
  target: BoundPMActionTree,
  source: PMActionTree<TState>,
  store: PMStore<TState>,
): void {
  for (const [name, action] of Object.entries(source)) {
    if (typeof action === 'function') {
      target[name] = (context?: PMActionContext, ...args: unknown[]) => {
        return action(store, context as PMActionContext<TState> | undefined, ...args)
      }
      continue
    }

    const child = typeof target[name] === 'object' && target[name] !== null
      ? target[name] as BoundPMActionTree
      : {}
    target[name] = child
    mergeActions(child, action, store)
  }
}

function toStoreChange(pending: PendingChange[]): PMStoreChange {
  const paths = Array.from(
    new Set(pending.map((change) => change.path).filter((path): path is string => Boolean(path))),
  ).sort()
  const last = pending[pending.length - 1]

  if (pending.length === 1 && last) {
    return {
      type: last.type,
      paths,
      path: last.path,
      scope: last.scope,
      value: last.value,
      previousValue: last.previousValue,
    }
  }

  return {
    type: 'batch',
    paths,
    path: last?.path,
    scope: last?.scope,
    value: last?.value,
    previousValue: last?.previousValue,
  }
}

function watchTouched(deps: Set<string>, paths: string[]): boolean {
  if (deps.size === 0 || paths.length === 0) {
    return true
  }

  for (const dep of deps) {
    for (const path of paths) {
      if (pathsTouch(dep, path)) {
        return true
      }
    }
  }

  return false
}

function pathsTouch(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}.`) || right.startsWith(`${left}.`)
}

function joinPath(basePath: string, key: string | number): string {
  const segment = String(key)
  return basePath ? `${basePath}.${segment}` : segment
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split('.').filter(Boolean)
  if (segments.length === 0) {
    return
  }

  let current = target
  for (const segment of segments.slice(0, -1)) {
    const child = current[segment]
    if (child === null || typeof child !== 'object') {
      current[segment] = {}
    }
    current = current[segment] as Record<string, unknown>
  }

  current[segments[segments.length - 1]!] = value
}

function toRaw<T>(value: T): T {
  return (
    value !== null &&
    typeof value === 'object' &&
    proxyToRaw.has(value)
  )
    ? proxyToRaw.get(value) as T
    : value
}

function cloneSnapshot(value: unknown, seen = new WeakMap<object, unknown>()): unknown {
  const raw = toRaw(value)
  if (raw === null || typeof raw !== 'object') {
    return raw
  }

  if (raw instanceof Date) {
    return raw.toISOString()
  }

  if (seen.has(raw)) {
    return seen.get(raw)
  }

  if (Array.isArray(raw)) {
    const array: unknown[] = []
    seen.set(raw, array)
    for (const item of raw) {
      array.push(cloneSnapshot(item, seen))
    }
    return array
  }

  const output: Record<string, unknown> = {}
  seen.set(raw, output)
  for (const [key, child] of Object.entries(raw)) {
    if (child !== undefined && typeof child !== 'function') {
      output[key] = cloneSnapshot(child, seen)
    }
  }
  return output
}
