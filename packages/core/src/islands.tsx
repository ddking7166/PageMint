import type { Child } from 'hono/jsx'
import type { PMStore, PMStoreSnapshot } from './store.js'

export type IslandClient = 'vanilla' | 'signal' | 'react' | 'vue' | string

export interface IslandDefinition {
  id: string
  client: IslandClient
  hydrate: boolean
  store?: boolean
  component?: string
  props?: unknown
  src?: string
}

export interface IslandProps {
  id?: string
  client?: IslandClient
  hydrate?: boolean
  component?: string
  props?: unknown
  src?: string
  store?: PMStore | boolean
  children?: Child
}

export interface IslandRuntimeOptions {
  runtimeSrc?: string
  nonce?: string
  store?: PMStore | PMStoreSnapshot | unknown
}

export interface MountScriptOptions {
  id?: string
  client?: IslandClient
  props?: unknown
}

const ISLAND_ATTR = 'data-pagemint-island'
const ISLAND_RUNTIME_ATTR = 'data-pagemint-island-runtime'
const STORE_STATE_ATTR = 'data-pagemint-store-state'

export function Island({
  id,
  client = 'vanilla',
  hydrate = true,
  component,
  props,
  src,
  store,
  children,
}: IslandProps) {
  const definition = normalizeIslandDefinition({
    id,
    client,
    hydrate,
    component,
    props,
    src,
    store,
  })
  const storeSnapshot = isPMStoreLike(store) ? resolveStoreSnapshot(store) : undefined
  const attrs: Record<string, string> = {
    [ISLAND_ATTR]: 'true',
    'data-pagemint-island-id': definition.id,
    'data-pagemint-client': definition.client,
    'data-pagemint-hydrate': definition.hydrate ? 'true' : 'false',
  }

  if (definition.component) attrs['data-pagemint-component'] = definition.component
  if (definition.src) attrs['data-pagemint-src'] = definition.src
  if (definition.client === 'signal' || definition.store) attrs['data-pagemint-store'] = 'true'
  if (definition.props !== undefined) {
    attrs['data-pagemint-props'] = serializeIslandProps(definition.props)
  }

  return (
    <pagemint-island {...attrs}>
      {storeSnapshot === undefined ? null : (
        <script
          type="application/json"
          data-pagemint-store-state="true"
          dangerouslySetInnerHTML={{ __html: escapeScriptJson(storeSnapshot) }}
        ></script>
      )}
      {children}
      <script
        type="application/json"
        data-pagemint-island-meta={definition.id}
        dangerouslySetInnerHTML={{ __html: escapeScriptJson(definition) }}
      ></script>
    </pagemint-island>
  )
}

export function island(options: IslandProps): IslandDefinition {
  return normalizeIslandDefinition(options)
}

export function mount(selector: string, options: MountScriptOptions = {}): string {
  const target = JSON.stringify(selector).replaceAll('</script', '<\\/script')
  const payload = JSON.stringify(options).replaceAll('</script', '<\\/script')

  return `<script type="module">window.PageMint && window.PageMint.mount(${target}, ${payload});</script>`
}

export function hasIslands(html: string): boolean {
  return html.includes(ISLAND_ATTR)
}

export function hasIslandRuntime(html: string): boolean {
  return html.includes(ISLAND_RUNTIME_ATTR)
}

export function injectIslandRuntime(html: string, options: IslandRuntimeOptions = {}): string {
  if (!hasIslands(html)) {
    return html
  }

  const withStore = options.store === undefined
    ? html
    : injectStoreSnapshot(html, resolveStoreSnapshot(options.store), options.nonce)

  if (hasIslandRuntime(withStore)) {
    return withStore
  }

  const script = renderIslandMountScript(options)
  const bodyClose = /<\/body\s*>/i

  if (bodyClose.test(withStore)) {
    return withStore.replace(bodyClose, `${script}</body>`)
  }

  return `${withStore}${script}`
}

export function renderIslandMountScript(options: IslandRuntimeOptions = {}): string {
  const nonce = options.nonce ? ` nonce="${escapeHtmlAttr(options.nonce)}"` : ''

  if (options.runtimeSrc) {
    return `<script type="module" ${ISLAND_RUNTIME_ATTR}="true"${nonce} src="${escapeHtmlAttr(options.runtimeSrc)}"></script>`
  }

  return `<script type="module" ${ISLAND_RUNTIME_ATTR}="true"${nonce}>${getIslandRuntimeScript()}</script>`
}

export function getIslandRuntimeScript(): string {
  return ISLAND_RUNTIME_SOURCE
}

function normalizeIslandDefinition(options: IslandProps): IslandDefinition {
  return {
    id: options.id ?? options.component ?? 'island',
    client: options.client ?? 'vanilla',
    hydrate: options.hydrate ?? true,
    store: options.store === undefined ? undefined : Boolean(options.store),
    component: options.component,
    props: options.props,
    src: options.src,
  }
}

function serializeIslandProps(props: unknown): string {
  return JSON.stringify(props).replaceAll('</script', '<\\/script')
}

function escapeHtmlAttr(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function injectStoreSnapshot(
  html: string,
  snapshot: unknown,
  nonce?: string,
): string {
  if (html.includes(STORE_STATE_ATTR)) {
    return html
  }

  const nonceAttr = nonce ? ` nonce="${escapeHtmlAttr(nonce)}"` : ''
  const script = `<script type="application/json" ${STORE_STATE_ATTR}="true"${nonceAttr}>${escapeScriptJson(snapshot)}</script>`
  const runtimeIndex = html.indexOf(`<script type="module" ${ISLAND_RUNTIME_ATTR}`)
  const bodyClose = /<\/body\s*>/i

  if (runtimeIndex >= 0) {
    return `${html.slice(0, runtimeIndex)}${script}${html.slice(runtimeIndex)}`
  }

  if (bodyClose.test(html)) {
    return html.replace(bodyClose, `${script}</body>`)
  }

  return `${html}${script}`
}

function resolveStoreSnapshot(storeOrSnapshot: unknown): unknown {
  if (isPMStoreLike(storeOrSnapshot)) {
    return (storeOrSnapshot as PMStore).snapshot()
  }

  return storeOrSnapshot
}

function isPMStoreLike(value: unknown): value is PMStore {
  return (
    value !== null &&
    typeof value === 'object' &&
    'snapshot' in value &&
    typeof (value as { snapshot?: unknown }).snapshot === 'function'
  )
}

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value ?? {})
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}

const ISLAND_RUNTIME_SOURCE = `(() => {
  const global = window;
  const existing = global.PageMint || {};
  const registry = new Map(Object.entries(global.PageMintIslands || {}));
  const adapters = new Map();
  const bus = existing.bus || createEventBus();
  let activeCollector = null;

  function parseProps(el) {
    const raw = el.getAttribute('data-pagemint-props');
    if (!raw) return undefined;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('[PageMint] Failed to parse island props', error);
      return undefined;
    }
  }

  function parseStoreSnapshot() {
    const el = document.querySelector('[data-pagemint-store-state]');
    if (!el || !el.textContent) return {};
    try {
      return JSON.parse(el.textContent);
    } catch (error) {
      console.warn('[PageMint] Failed to parse store snapshot', error);
      return {};
    }
  }

  function createEventBus() {
    const events = new Map();
    return {
      on(event, handler) {
        if (!event || typeof handler !== 'function') return () => {};
        let handlers = events.get(event);
        if (!handlers) {
          handlers = new Set();
          events.set(event, handlers);
        }
        handlers.add(handler);
        return () => this.off(event, handler);
      },
      off(event, handler) {
        const handlers = events.get(event);
        if (!handlers) return;
        handlers.delete(handler);
        if (handlers.size === 0) events.delete(event);
      },
      emit(event, payload) {
        for (const handler of events.get(event) || []) {
          handler(payload);
        }
      }
    };
  }

  function createPMStore(initialState, options) {
    const rawToProxy = new WeakMap();
    const proxyToRaw = new WeakMap();
    const subscribers = new Set();
    const watchers = new Set();
    const actions = {};
    const pending = [];
    let batchDepth = 0;
    let scheduled = false;
    const rawState = unwrap(initialState || {});
    const store = {
      state: reactive(rawState, ''),
      actions,
      subscribe(listener) {
        subscribers.add(listener);
        listener(store.state, { type: 'init', paths: [] });
        return () => subscribers.delete(listener);
      },
      watch(selector, listener, watchOptions) {
        const collected = collect(selector);
        const record = {
          selector,
          listener,
          deps: collected.deps,
          value: collected.value
        };
        watchers.add(record);
        if (!watchOptions || watchOptions.immediate !== false) {
          listener(collected.value, undefined, { type: 'init', paths: [] });
        }
        return () => watchers.delete(record);
      },
      setState(partial) {
        store.batch(() => {
          Object.entries(partial || {}).forEach(([key, value]) => {
            store.state[key] = value;
          });
        });
      },
      patch(scopeOrPartial, value) {
        if (typeof scopeOrPartial !== 'string') {
          store.setState(scopeOrPartial || {});
          store.emit('store:patch', { scope: undefined, value: scopeOrPartial });
          return;
        }
        const scope = scopeOrPartial.trim();
        if (!scope) return;
        if (arguments.length >= 2) {
          setPath(store.state, scope, value);
        }
        queueChange({ type: 'patch', path: scope, scope, value });
        store.emit('store:patch', { scope, value });
      },
      invalidate(scope) {
        const normalized = String(scope || '').trim();
        if (!normalized) return;
        queueChange({ type: 'invalidate', path: normalized, scope: normalized });
        store.emit('store:invalidate', { scope: normalized });
      },
      snapshot() {
        return cloneSnapshot(rawState);
      },
      batch(fn) {
        batchDepth += 1;
        try {
          fn();
        } finally {
          batchDepth -= 1;
          if (batchDepth === 0) scheduleFlush();
        }
      },
      on(event, handler) {
        return bus.on(event, handler);
      },
      off(event, handler) {
        bus.off(event, handler);
      },
      emit(event, payload) {
        bus.emit(event, payload);
      },
      registerActions(nextActions) {
        mergeActions(actions, nextActions || {});
      }
    };

    if (options && options.actions) {
      store.registerActions(options.actions);
    }

    function reactive(target, basePath) {
      const raw = unwrap(target);
      const existingProxy = rawToProxy.get(raw);
      if (existingProxy) return existingProxy;
      const proxy = new Proxy(raw, {
        get(current, key, receiver) {
          if (key === '__pagemintRaw') return current;
          const value = Reflect.get(current, key, receiver);
          if (typeof key === 'symbol') return wrapChild(value, basePath);
          const path = joinPath(basePath, key);
          track(path);
          return wrapChild(value, path);
        },
        set(current, key, nextValue, receiver) {
          if (typeof key === 'symbol') {
            return Reflect.set(current, key, nextValue, receiver);
          }
          const path = joinPath(basePath, key);
          const previousValue = Reflect.get(current, key, receiver);
          const rawNextValue = unwrap(nextValue);
          if (Object.is(previousValue, rawNextValue)) return true;
          const didSet = Reflect.set(current, key, rawNextValue, receiver);
          if (didSet) {
            queueChange({ type: 'set', path, value: rawNextValue, previousValue });
          }
          return didSet;
        },
        deleteProperty(current, key) {
          if (typeof key === 'symbol') return Reflect.deleteProperty(current, key);
          if (!Reflect.has(current, key)) return true;
          const path = joinPath(basePath, key);
          const previousValue = Reflect.get(current, key);
          const didDelete = Reflect.deleteProperty(current, key);
          if (didDelete) {
            queueChange({ type: 'delete', path, previousValue });
          }
          return didDelete;
        }
      });
      rawToProxy.set(raw, proxy);
      proxyToRaw.set(proxy, raw);
      return proxy;
    }

    function wrapChild(value, path) {
      if (value === null || typeof value !== 'object') return value;
      return reactive(value, path);
    }

    function unwrap(value) {
      return value && typeof value === 'object' && proxyToRaw.has(value)
        ? proxyToRaw.get(value)
        : value;
    }

    function track(path) {
      if (!activeCollector || !path) return;
      activeCollector.deps.add(path);
    }

    function collect(selector) {
      const previous = activeCollector;
      const collector = { deps: new Set() };
      activeCollector = collector;
      try {
        return {
          deps: collector.deps,
          value: selector()
        };
      } finally {
        activeCollector = previous;
      }
    }

    function queueChange(change) {
      pending.push(change);
      if (batchDepth === 0) scheduleFlush();
    }

    function scheduleFlush() {
      if (scheduled || pending.length === 0 || batchDepth > 0) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        flush();
      });
    }

    function flush() {
      if (pending.length === 0) return;
      const change = toStoreChange(pending.splice(0));
      subscribers.forEach((subscriber) => subscriber(store.state, change));
      watchers.forEach((record) => {
        if (!watchTouched(record.deps, change.paths)) return;
        const previousValue = record.value;
        const collected = collect(record.selector);
        record.deps = collected.deps;
        record.value = collected.value;
        record.listener(collected.value, previousValue, change);
      });
    }

    function mergeActions(target, source) {
      Object.entries(source).forEach(([name, action]) => {
        if (typeof action === 'function') {
          target[name] = (context, ...args) => action(store, context, ...args);
          return;
        }
        const child = target[name] && typeof target[name] === 'object' ? target[name] : {};
        target[name] = child;
        mergeActions(child, action);
      });
    }

    return store;
  }

  function createStore(options) {
    return createPMStore((options && options.state) || {}, { actions: options && options.actions });
  }

  function signal(initialValue) {
    let value = initialValue;
    const listeners = new Set();
    return {
      get value() {
        return value;
      },
      set value(next) {
        value = next;
        listeners.forEach((listener) => listener(value));
      },
      subscribe(listener) {
        listeners.add(listener);
        listener(value);
        return () => listeners.delete(listener);
      }
    };
  }

  function usePMStore() {
    return store;
  }

  const store = existing.store || createPMStore(parseStoreSnapshot());
  if (existing.store) {
    existing.store.setState(parseStoreSnapshot());
  }

  function register(id, handler) {
    if (!id || typeof handler !== 'function') return;
    registry.set(id, handler);
  }

  function registerAdapter(client, handler) {
    if (!client || typeof handler !== 'function') return;
    adapters.set(client, handler);
  }

  function mount(target, handlerOrOptions) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;
    if (typeof handlerOrOptions === 'function') {
      return handlerOrOptions(createIslandContext(el, {}, el.getAttribute('data-pagemint-island-id'), el.getAttribute('data-pagemint-client') || 'vanilla'));
    }
    const options = handlerOrOptions || {};
    const id = options.id || el.getAttribute('data-pagemint-island-id');
    const client = options.client || el.getAttribute('data-pagemint-client') || 'vanilla';
    const handler = registry.get(id);
    mountSignalIsland(el);
    if (handler) {
      return handler(createIslandContext(el, options.props, id, client));
    }
    return null;
  }

  async function hydrate(el) {
    if (!el || el.dataset.pagemintMounted === 'true') return;
    if (el.getAttribute('data-pagemint-hydrate') === 'false') return;

    const id = el.getAttribute('data-pagemint-island-id');
    const client = el.getAttribute('data-pagemint-client') || 'vanilla';
    const component = el.getAttribute('data-pagemint-component') || id;
    const src = el.getAttribute('data-pagemint-src');
    const props = parseProps(el);
    const context = createIslandContext(el, props, id, client, component);

    mountSignalIsland(el);

    if (src) {
      const module = await import(src);
      const handler = module.default || module.mount;
      if (typeof handler === 'function') {
        await handler(context);
        el.dataset.pagemintMounted = 'true';
        return;
      }
    }

    const handler = registry.get(id) || registry.get(component);
    if (handler) {
      await handler(context);
      el.dataset.pagemintMounted = 'true';
      return;
    }

    const adapter = adapters.get(client);
    if (adapter) {
      await adapter(context);
      el.dataset.pagemintMounted = 'true';
      return;
    }

    el.dispatchEvent(new CustomEvent('pagemint:island', {
      bubbles: true,
      detail: context
    }));
    el.dataset.pagemintMounted = 'true';
  }

  function createIslandContext(el, props, id, client, component) {
    return {
      el,
      props,
      id,
      component: component || id,
      client,
      signal,
      store,
      usePMStore,
      watch: store.watch.bind(store),
      on: store.on.bind(store),
      emit: store.emit.bind(store)
    };
  }

  function mountSignalIsland(root) {
    if (!root || root.dataset.pagemintSignalMounted === 'true') return;
    root.dataset.pagemintSignalMounted = 'true';
    bindSignalTargets(root);
    root.addEventListener('click', handleActionClick);
  }

  function bindSignalTargets(root) {
    forEachSignalNode(root, '[data-pm-text]', (node) => {
      const path = node.getAttribute('data-pm-text');
      store.watch(() => readPath(store.state, path), (value) => {
        node.textContent = stringifyDomValue(value);
      });
    });
    forEachSignalNode(root, '[data-pm-html]', (node) => {
      const path = node.getAttribute('data-pm-html');
      store.watch(() => readPath(store.state, path), (value) => {
        node.innerHTML = value == null ? '' : String(value);
      });
    });
    forEachSignalNode(root, '[data-pm-value]', (node) => {
      const path = node.getAttribute('data-pm-value');
      store.watch(() => readPath(store.state, path), (value) => {
        node.value = value == null ? '' : String(value);
      });
      node.addEventListener('input', () => setPath(store.state, path, node.value));
    });
    forEachSignalNode(root, '[data-pm-show]', (node) => {
      const path = node.getAttribute('data-pm-show');
      store.watch(() => readPath(store.state, path), (value) => {
        node.hidden = !value;
      });
    });
    forEachSignalNode(root, '[data-pm-class]', (node) => {
      const path = node.getAttribute('data-pm-class');
      store.watch(() => readPath(store.state, path), (value, previousValue) => {
        if (previousValue) node.classList.remove(String(previousValue));
        if (value) node.classList.add(String(value));
      });
    });
  }

  function forEachSignalNode(root, selector, fn) {
    if (root.matches && root.matches(selector)) fn(root);
    root.querySelectorAll(selector).forEach(fn);
  }

  function handleActionClick(event) {
    const actionEl = event.target && event.target.closest ? event.target.closest('[data-action]') : null;
    if (!actionEl) return;
    const actionName = actionEl.getAttribute('data-action');
    const action = resolvePath(store.actions, actionName);
    const payload = parsePayload(actionEl.getAttribute('data-payload'));
    const context = { store, state: store.state, event, el: actionEl, payload };
    if (typeof action === 'function') {
      action(context);
      return;
    }
    store.emit('action', { name: actionName, context });
    store.emit(actionName, context);
  }

  function hydrateAll(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-pagemint-island]').forEach((el) => {
      hydrate(el).catch((error) => {
        console.error('[PageMint] Island hydration failed', error);
      });
    });
  }

  function readPath(target, path) {
    return resolvePath(target, path);
  }

  function resolvePath(target, path) {
    if (!target || !path) return undefined;
    return String(path).split('.').filter(Boolean).reduce((current, segment) => {
      return current == null ? undefined : current[segment];
    }, target);
  }

  function setPath(target, path, value) {
    const segments = String(path || '').split('.').filter(Boolean);
    if (segments.length === 0) return;
    let current = target;
    segments.slice(0, -1).forEach((segment) => {
      if (!current[segment] || typeof current[segment] !== 'object') current[segment] = {};
      current = current[segment];
    });
    current[segments[segments.length - 1]] = value;
  }

  function parsePayload(raw) {
    if (!raw) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  function stringifyDomValue(value) {
    if (value == null) return '';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }

  function joinPath(basePath, key) {
    return basePath ? basePath + '.' + String(key) : String(key);
  }

  function toStoreChange(pending) {
    const paths = Array.from(new Set(pending.map((change) => change.path).filter(Boolean))).sort();
    const last = pending[pending.length - 1] || {};
    if (pending.length === 1) {
      return {
        type: last.type,
        paths,
        path: last.path,
        scope: last.scope,
        value: last.value,
        previousValue: last.previousValue
      };
    }
    return {
      type: 'batch',
      paths,
      path: last.path,
      scope: last.scope,
      value: last.value,
      previousValue: last.previousValue
    };
  }

  function watchTouched(deps, paths) {
    if (deps.size === 0 || paths.length === 0) return true;
    for (const dep of deps) {
      for (const path of paths) {
        if (dep === path || dep.startsWith(path + '.') || path.startsWith(dep + '.')) return true;
      }
    }
    return false;
  }

  function cloneSnapshot(value, seen) {
    if (value === null || typeof value !== 'object') return value;
    const raw = value.__pagemintRaw || value;
    const cache = seen || new WeakMap();
    if (cache.has(raw)) return cache.get(raw);
    if (Array.isArray(raw)) {
      const array = [];
      cache.set(raw, array);
      raw.forEach((item) => array.push(cloneSnapshot(item, cache)));
      return array;
    }
    const output = {};
    cache.set(raw, output);
    Object.entries(raw).forEach(([key, child]) => {
      if (child !== undefined && typeof child !== 'function') {
        output[key] = cloneSnapshot(child, cache);
      }
    });
    return output;
  }

  existing.islands = Object.assign(existing.islands || {}, {
    register,
    registerAdapter,
    hydrate,
    hydrateAll,
    mountIsland: mountSignalIsland
  });
  existing.registerIsland = register;
  existing.registerIslandAdapter = registerAdapter;
  existing.mount = mount;
  existing.mountIsland = mountSignalIsland;
  existing.signal = signal;
  existing.createPMStore = createPMStore;
  existing.createStore = createStore;
  existing.usePMStore = usePMStore;
  existing.store = store;
  existing.bus = bus;
  existing.on = store.on.bind(store);
  existing.off = store.off.bind(store);
  existing.emit = store.emit.bind(store);
  global.PageMint = existing;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => hydrateAll(document), { once: true });
  } else {
    hydrateAll(document);
  }
})();`
