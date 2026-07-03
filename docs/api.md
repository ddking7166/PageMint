# API Reference

This document lists the public PageMint APIs, parameters, return values, and important behavior.

## `@pagemint/hono`

### `createPageMintApp(options?)`

Creates a Hono app with PageMint page registration, cache revalidation, and invalidation helpers.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `CreatePageMintAppOptions` | No | App-level PageMint options. Same shape as `PageMintAppOptions`. |
| `options.cache` | `CacheStore` | No | Cache adapter. If omitted, pages render without cache. |
| `options.now` | `() => number` | No | Clock function in milliseconds. Defaults to `Date.now`. Useful for tests. |
| `options.onError` | `(error, context) => void` | No | Error hook for cache, render, route, and revalidation failures. |

Returns `PageMintHonoApp`.

### `CreatePageMintAppOptions`

Alias for `PageMintAppOptions`.

### `PageMintHonoApp`

Hono app extended with PageMint methods.

| Field or Method | Type | Description |
| --- | --- | --- |
| `page` | `<TData>(page: DefinePageOptions<TData>) => PageMintHonoApp` | Registers a PageMint page. |
| `revalidate` | `(pathOrUrl: string) => Promise<CacheEntry | null>` | Rebuilds by path or URL. |
| `revalidateByKey` | `(key: string) => Promise<CacheEntry | null>` | Rebuilds by cache key. |
| `revalidateTag` | `(tag: string) => Promise<CacheEntry[]>` | Rebuilds by cache tag. |
| `invalidate` | `(pathOrUrl: string) => Promise<void>` | Deletes by path or URL. |
| `invalidateByKey` | `(key: string) => Promise<void>` | Deletes by cache key. |
| `revalidator` | `Revalidator` | Background revalidator instance. |
| `engine` | `PageMintEngine` | Underlying core engine. |

### `app.page(page)`

Registers a PageMint page as a Hono `GET` route.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `page` | `DefinePageOptions<TData>` | Yes | Page definition returned by `definePage()` or an object with the same shape. |

Returns the same `PageMintHonoApp`, so calls can be chained.

### `app.revalidate(pathOrUrl)`

Rebuilds a cached page by path or URL.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `pathOrUrl` | `string` | Yes | Absolute URL or path such as `/movies/123`. Query parameters are preserved. |

Returns `Promise<CacheEntry | null>`. Returns `null` when cache is disabled, no page matches, or the page has no cache config.

### `app.revalidateByKey(key)`

Rebuilds a cached page by cache key.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Cache key previously seen by PageMint. |

Returns `Promise<CacheEntry | null>`. Throws `PageMintError` when the key has no known page context.

### `app.revalidateTag(tag)`

Rebuilds all currently known cached pages associated with a tag.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `tag` | `string` | Yes | Cache tag from `cache.tags`. Leading and trailing whitespace is ignored. |

Returns `Promise<CacheEntry[]>`.

Notes:

- Tags are indexed in the current process when a cached page is requested or rebuilt.
- `revalidateTag()` can only rebuild keys known to the current process.
- In multi-process or multi-region deployments, call `revalidateTag()` on each instance or broadcast the operation through your own infrastructure.

### `app.invalidate(pathOrUrl)`

Deletes a cached page by path or URL.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `pathOrUrl` | `string` | Yes | Absolute URL or path such as `/movies/123`. Query parameters are preserved. |

Returns `Promise<void>`.

### `app.invalidateByKey(key)`

Deletes a cached page by cache key and removes it from the in-process tag index.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Cache key to delete. |

Returns `Promise<void>`.

### `app.revalidator`

Exposes the app-level `Revalidator` instance.

See `PageMintRevalidator` and `RevalidatorTask` below for method and parameter details.

### `app.engine`

Exposes the underlying `PageMintEngine`.

Use this for advanced integrations and tests. Application code should usually prefer the app-level helpers above.

### `pagemintPoweredBy(value?)`

Returns Hono middleware that sets the `x-powered-by` response header.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `value` | `string` | No | `'PageMint'` | Header value. |

Returns `MiddlewareHandler`.

## Pages

### `definePage(options)`

Preserves the page definition and its TypeScript inference.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `DefinePageOptions<TData>` | Yes | Page definition. |
| `options.path` | `string` | Yes | Route path. Supports static segments, `:param`, trailing `*`, and trailing `:name*`. |
| `options.load` | `(ctx: PageContext) => TData \| Promise<TData>` | Yes | Server data loader. Runs before render and before cache hash comparison. |
| `options.render` | `(ctx: PageRenderContext<TData>) => PageRenderResult \| Promise<PageRenderResult>` | Yes | Server render function. Returns JSX, HTML string, or `PageRenderResponse`. |
| `options.cache` | `PageCacheOptions<TData>` | No | Page cache settings. If omitted, the page always renders without cache. |

Returns `DefinePageOptions<TData>`.

### `PageContext`

Passed to `load()`, `cache.key()`, and path-based cache operations.

| Field | Type | Description |
| --- | --- | --- |
| `request` | `Request` | Original request object. |
| `params` | `Record<string, string>` | Route params. Wildcard `*` is stored as `params['*']`; named wildcard `:path*` is stored as `params.path`. |
| `query` | `URLSearchParams` | Request query parameters. |
| `pathname` | `string` | URL pathname. |

### `PageRenderContext<TData>`

Extends `PageContext` for `render()`.

| Field | Type | Description |
| --- | --- | --- |
| `data` | `TData` | Value returned by `load()`. |
| `request` | `Request` | Original request object. |
| `params` | `Record<string, string>` | Route params. |
| `query` | `URLSearchParams` | Request query parameters. |
| `pathname` | `string` | URL pathname. |

### `PageCacheOptions<TData>`

Controls route HTML caching.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `ttl` | `number` | No | Fresh period in milliseconds. If omitted, the entry never becomes stale. |
| `staleTtl` | `number` | No | Extra stale-serving period in milliseconds after `ttl`. If omitted, stale entries do not expire. |
| `key` | `(ctx: PageContext) => string \| Promise<string>` | No | Custom cache key resolver. Defaults to `page:${pathname}` plus sorted query params. |
| `hash` | `(data: TData) => string \| Promise<string>` | No | Data fingerprint. If unchanged, PageMint refreshes metadata without rerendering HTML. Defaults to `createDataHash(data)`. |
| `tags` | `string[] \| (ctx: PageCacheTagContext<TData>) => string[] \| Promise<string[]>` | No | Cache tags for `revalidateTag()`. Tags are trimmed, deduplicated, sorted, and stored on `CacheEntry.tags`. |
| `revalidate` | `'on-request' \| 'background' \| 'manual'` | No | Stale behavior. Defaults to `'background'`. |

`revalidate` modes:

| Value | Behavior |
| --- | --- |
| `'background'` | Serve stale HTML immediately and rebuild in the background. |
| `'on-request'` | Wait for rebuild before responding to a stale request. |
| `'manual'` | Serve stale HTML until `revalidate()`, `revalidateByKey()`, or `revalidateTag()` is called. |

### `PageCacheTagContext<TData>`

Passed to dynamic `cache.tags`.

| Field | Type | Description |
| --- | --- | --- |
| `data` | `TData` | Loaded page data. |
| `request` | `Request` | Original request object. |
| `params` | `Record<string, string>` | Route params. |
| `query` | `URLSearchParams` | Request query parameters. |
| `pathname` | `string` | URL pathname. |

### `PageCacheTag`

Alias for `string`.

Use short, stable names such as `movie`, `movie:123`, or `category:drama`.

### `PageCacheTags<TData>`

Allowed shapes for `cache.tags`.

| Shape | Description |
| --- | --- |
| `string[]` | Static tags for every cache entry built by the page. |
| `(ctx: PageCacheTagContext<TData>) => string[] \| Promise<string[]>` | Dynamic tags based on request context and loaded data. |

### `PageRenderResult`

The value returned by `render()`.

| Type | Description |
| --- | --- |
| `Child` | Hono JSX. |
| `string` | Raw HTML string. |
| `PageRenderResponse` | Wrapped response from `pageResponse()`, `redirect()`, or `notFound()`. |

### `PageRenderBody`

Alias for `Child | string`.

### `PageRenderResponse`

Wrapped render response.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `__pagemintResponse` | `true` | Yes | Internal marker used by `isPageRenderResponse()`. |
| `body` | `PageRenderBody` | Yes | JSX or HTML string. |
| `status` | `number` | No | HTTP status. Defaults to `200` when omitted. |
| `headers` | `Record<string, string>` | No | Response headers. |

### `PageResponse`

Normalized response returned by `PageMintEngine.handlePage()`.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `html` | `string` | Yes | Response body. |
| `status` | `number` | Yes | HTTP status. |
| `headers` | `Record<string, string>` | Yes | Response headers. |
| `cacheKey` | `string` | No | Cache key used for this response. |
| `cacheStatus` | `PageCacheStatus` | Yes | Cache result status. |
| `entry` | `CacheEntry` | No | Cache entry used to produce the response. |

### `PageCacheStatus`

Cache status values sent by the Hono adapter as `x-pagemint-cache`.

| Value | Description |
| --- | --- |
| `'bypass'` | Page rendered without cache. |
| `'hit'` | Fresh cache entry was served. |
| `'miss'` | No entry existed and PageMint built one synchronously. |
| `'stale'` | Stale entry was served. |
| `'revalidated'` | Existing entry was rebuilt before responding. |

### `RegisteredPage<TData>`

Internal registered page record.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Stable registration id in the current process. |
| `options` | `DefinePageOptions<TData>` | Yes | Original page options. |

### `pageResponse(body, init?)`

Wraps a page render body with status and headers.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `body` | `PageRenderBody` | Yes | JSX or HTML string. |
| `init` | `PageResponseInit` | No | Response metadata. |
| `init.status` | `number` | No | HTTP status. Defaults to `200`. |
| `init.headers` | `Record<string, string>` | No | Response headers. |

Returns `PageRenderResponse`.

### `redirect(location, status?, headers?)`

Creates a redirect page response.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `location` | `string` | Yes | None | Redirect target. Stored in the `location` header. |
| `status` | `number` | No | `302` | Redirect status code. |
| `headers` | `Record<string, string>` | No | `{}` | Extra response headers. |

Returns `PageRenderResponse` with an empty body.

### `notFound(body?, headers?)`

Creates a `404` page response.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `body` | `PageRenderBody` | No | `'Not Found'` | JSX or HTML string body. |
| `headers` | `Record<string, string>` | No | `{}` | Extra response headers. |

Returns `PageRenderResponse`.

### `isPageRenderResponse(value)`

Checks whether a value is a PageMint render response wrapper.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `value` | `unknown` | Yes | Value to inspect. |

Returns `boolean`.

## Routing

### `matchPath(pattern, pathname)`

Matches a PageMint route pattern against a pathname.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `pattern` | `string` | Yes | Route pattern such as `/movies/:id` or `/docs/:path*`. |
| `pathname` | `string` | Yes | Request pathname. Query strings are ignored. |

Returns `{ params: Record<string, string> } | null`.

### `findMatchingPage(pages, pathname)`

Finds the first registered page matching a pathname.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `pages` | `RegisteredPage[]` | Yes | Pages to scan in registration order. |
| `pathname` | `string` | Yes | Request pathname. |

Returns `{ page: RegisteredPage; params: Record<string, string> } | null`.

## Context And Cache Keys

### `createPageContext(request, params?)`

Builds `PageContext` from a request.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `request` | `Request` | Yes | None | Request object. |
| `params` | `Record<string, string>` | No | `{}` | Route params. |

Returns `PageContext`.

### `clonePageContext(ctx)`

Clones a page context for later cache revalidation.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `ctx` | `PageContext` | Yes | Context to clone. |

Returns `PageContext`. The cloned request is synthetic and preserves `ctx.request.url`.

### `createSyntheticRequest(pathOrUrl)`

Creates a synthetic `Request`.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `pathOrUrl` | `string` | Yes | Absolute URL or path. Relative paths use `http://localhost` as the base. |

Returns `Request`.

### `resolveCacheKey(page, ctx)`

Resolves the cache key for a page and context.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `page` | `DefinePageOptions<TData>` | Yes | Page definition. |
| `ctx` | `PageContext` | Yes | Page context. |

Returns `Promise<string>`.

### `defaultCacheKey(ctx)`

Builds the default cache key.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `ctx` | `PageContext` | Yes | Page context. |

Returns `string`. Format is `page:${pathname}` with sorted query params appended when present.

### `normalizeQuery(query)`

Sorts query params by key and value.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `query` | `URLSearchParams` | Yes | Query params to normalize. |

Returns `string`.

### `joinCacheKey(...parts)`

Joins cache key parts with `:`.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `...parts` | `Array<string \| number \| boolean \| null \| undefined>` | No | Empty string, `null`, and `undefined` are skipped. Other values are stringified. |

Returns `string`.

`CacheKeyPart` is `string | number | boolean | null | undefined`.

### `cacheKeyWithQuery(prefix, query)`

Appends normalized query params to a cache key prefix.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `prefix` | `string` | Yes | Cache key prefix. |
| `query` | `URLSearchParams` | Yes | Query params. |

Returns `string`. If query is empty, returns `prefix`.

## Rendering

### `renderToHtml(result)`

Renders JSX or returns an HTML string with doctype handling.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `result` | `PageRenderBody` | Yes | Hono JSX child or HTML string. |

Returns `Promise<string>`.

### `renderPageResult(result)`

Normalizes a render result into HTML, status, and headers.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `result` | `PageRenderResult` | Yes | JSX, HTML string, or `PageRenderResponse`. |

Returns `Promise<{ html: string; status: number; headers: Record<string, string> }>`.

## Client Scripts

These APIs are exported by `@pagemint/core` and re-exported by `@pagemint/hono`.

PageMint does not hydrate server JSX by default. Client scripts are explicit browser modules that pages or layouts render into the document.

### `defineClientManifest(manifest)`

Defines a typed client script manifest.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `manifest` | `ClientManifest` | Yes | Named client modules and optional default module ids. |
| `manifest.defaultModules` | `string[]` | No | Module ids loaded whenever `resolveClientScripts()` or `ClientScripts` is called. |
| `manifest.modules` | `Record<string, ClientModule>` | Yes | Client module map keyed by stable module id. |

Returns the same manifest object and preserves TypeScript inference.

### `ClientManifest`

Client script manifest shape.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `defaultModules` | `string[]` | No | Modules included automatically. |
| `modules` | `Record<string, ClientModule>` | Yes | Available client modules. |

### `ClientModule`

One named client script module.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `scripts` | `ClientScriptInput[]` | Yes | Browser scripts emitted when the module is selected. |
| `dependsOn` | `string[]` | No | Other module ids that must be emitted before this module. |

### `ClientScriptInput`

Allowed client script input shapes.

| Shape | Description |
| --- | --- |
| `string` | Script URL. Treated as `{ src, type: 'module' }`. |
| `ClientScript` | Full script descriptor. |

### `ClientScript`

Full browser script descriptor.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `src` | `string` | Yes | Script URL. |
| `type` | `'module' \| 'classic'` | No | Script kind. Defaults to `'module'`. Classic scripts render without a `type` attribute. |
| `async` | `boolean` | No | Adds the `async` attribute when true. |
| `defer` | `boolean` | No | Adds the `defer` attribute for classic scripts when true. Module scripts are deferred by browser semantics. |
| `integrity` | `string` | No | Subresource integrity value. |
| `nonce` | `string` | No | CSP nonce for this script. |
| `crossorigin` | `'anonymous' \| 'use-credentials'` | No | `crossorigin` attribute. |
| `referrerpolicy` | `string` | No | `referrerpolicy` attribute. |
| `attrs` | `Record<string, string \| number \| boolean \| null \| undefined>` | No | Additional attributes. `null`, `undefined`, and `false` are omitted. |

### `resolveClientScripts(manifest, options?)`

Expands module ids into a deduplicated script list.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `manifest` | `ClientManifest` | Yes | Client manifest. |
| `options` | `ResolveClientScriptsOptions \| string[]` | No | Modules and extra scripts. Passing `string[]` is shorthand for `{ modules }`. |
| `options.modules` | `string[]` | No | Module ids to include in addition to `manifest.defaultModules`. |
| `options.scripts` | `ClientScriptInput[]` | No | Extra scripts appended after resolved modules. |

Returns `ClientScript[]`.

Behavior:

- Module dependencies are emitted before the module that depends on them.
- Scripts are deduplicated by `src`; the first descriptor wins.
- Unknown module ids throw `Error`.
- Circular dependencies throw `Error`.

### `ClientScripts(props)`

JSX component that renders resolved scripts.

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `manifest` | `ClientManifest` | Yes | Client manifest. |
| `modules` | `string[]` | No | Module ids to include in addition to manifest defaults. |
| `scripts` | `ClientScriptInput[]` | No | Extra scripts appended after resolved modules. |
| `nonce` | `string` | No | CSP nonce applied to scripts without their own `nonce`. |

Returns a JSX fragment of `<script>` elements.

### `clientScriptAttrs(script, nonce?)`

Builds script tag attributes for custom rendering.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `script` | `ClientScriptInput` | Yes | Script input to normalize. |
| `nonce` | `string` | No | Fallback CSP nonce. Ignored when `script.nonce` is present. |

Returns `Record<string, string | number | boolean>`.

### `ClientScriptType`

Alias for `'module' | 'classic'`.

### `ClientScriptAttributeValue`

Alias for `string | number | boolean | null | undefined`.

### `ResolveClientScriptsOptions`

Options accepted by `resolveClientScripts()`.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `modules` | `string[]` | No | Extra module ids. |
| `scripts` | `ClientScriptInput[]` | No | Extra script descriptors. |

### `ClientScriptsProps`

Props accepted by `ClientScripts`.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `manifest` | `ClientManifest` | Yes | Client manifest. |
| `modules` | `string[]` | No | Extra module ids. |
| `scripts` | `ClientScriptInput[]` | No | Extra script descriptors. |
| `nonce` | `string` | No | Fallback CSP nonce. |

## Cache Entries

### `CacheEntry`

Stored HTML cache record.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `html` | `string` | Yes | Rendered HTML. |
| `createdAt` | `number` | Yes | Initial creation timestamp in milliseconds. |
| `updatedAt` | `number` | Yes | Last update timestamp in milliseconds. |
| `dataHash` | `string` | No | Data fingerprint. |
| `staleAt` | `number` | No | Timestamp when the entry stops being fresh. |
| `expireAt` | `number` | No | Timestamp when the stale entry can no longer be served. |
| `status` | `number` | No | HTTP status for the cached response. Defaults to `200` when omitted. |
| `tags` | `string[]` | No | Cache tags used by `revalidateTag()`. |
| `headers` | `Record<string, string>` | No | Response headers. |

### `createCacheEntry(input)`

Creates a normalized cache entry.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `object` | Yes | Entry input. |
| `input.html` | `string` | Yes | Rendered HTML. |
| `input.now` | `number` | Yes | Current timestamp in milliseconds. |
| `input.dataHash` | `string` | No | Data fingerprint. |
| `input.cache` | `PageCacheOptions<TData>` | No | Cache options used to compute `staleAt` and `expireAt`. |
| `input.status` | `number` | No | HTTP status. |
| `input.tags` | `string[]` | No | Cache tags. |
| `input.headers` | `Record<string, string>` | No | Response headers. |
| `input.previous` | `CacheEntry | null` | No | Previous entry. Preserves `createdAt` and provides fallback `status`/`tags`. |

Returns `CacheEntry`.

### `refreshCacheEntry(entry, cache, now, tags?)`

Refreshes cache metadata while keeping existing HTML.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `entry` | `CacheEntry` | Yes | Existing entry. |
| `cache` | `PageCacheOptions<TData> | undefined` | Yes | Cache options for new freshness metadata. |
| `now` | `number` | Yes | Current timestamp in milliseconds. |
| `tags` | `string[]` | No | Replacement tags. Defaults to `entry.tags`. |

Returns `CacheEntry`.

### `cloneCacheEntry(entry)`

Clones a cache entry.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `entry` | `CacheEntry` | Yes | Entry to clone. |

Returns `CacheEntry`.

### `isFresh(entry, now)`

Checks whether an entry is fresh.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `entry` | `CacheEntry` | Yes | Entry to inspect. |
| `now` | `number` | Yes | Current timestamp in milliseconds. |

Returns `boolean`.

### `canServeStale(entry, now)`

Checks whether an entry may still be served while stale.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `entry` | `CacheEntry` | Yes | Entry to inspect. |
| `now` | `number` | Yes | Current timestamp in milliseconds. |

Returns `boolean`.

## Cache Stores

### `CacheStore`

Adapter interface used by PageMint core.

| Method | Parameters | Return Type | Description |
| --- | --- | --- | --- |
| `get` | `key: string` | `Promise<CacheEntry | null>` | Reads one entry. |
| `set` | `key: string`, `entry: CacheEntry` | `Promise<void>` | Replaces one entry. |
| `delete` | `key: string` | `Promise<void>` | Deletes one entry. |
| `has` | `key: string` | `Promise<boolean>` | Optional existence check. |

### `memoryCache(initialEntries?)`

Creates an in-memory cache store.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `initialEntries` | `Iterable<[string, CacheEntry]>` | No | Initial entries copied into the store. |

Returns `MemoryCacheStore`.

`MemoryCacheStore` methods:

| Method | Parameters | Return Type | Description |
| --- | --- | --- | --- |
| `get` | `key: string` | `Promise<CacheEntry | null>` | Reads an entry copy. |
| `set` | `key: string`, `entry: CacheEntry` | `Promise<void>` | Stores an entry copy. |
| `delete` | `key: string` | `Promise<void>` | Deletes an entry. |
| `has` | `key: string` | `Promise<boolean>` | Checks existence. |
| `clear` | None | `void` | Removes all entries. |
| `keys` | None | `string[]` | Returns current keys. |
| `size` | None | `number` | Returns entry count. |

Alias: `createMemoryCache`.

### `fileCache(options)`

Creates a file-system cache store.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `FileCacheOptions` | Yes | File cache options. |
| `options.dir` | `string` | Yes | Directory where `.html` and `.json` cache files are stored. |

Returns `CacheStore`.

Alias: `createFileCache`.

### `redisCache(client, options?)`

Creates a Redis-like cache store.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `client` | `RedisLikeClient` | Yes | Client with `get`, `set`, `del`, and optional `exists`. |
| `options` | `RedisCacheOptions` | No | Redis cache options. |
| `options.prefix` | `string` | No | Key prefix. Defaults to `'pagemint:'`. |

`RedisLikeClient` methods:

| Method | Parameters | Return Type | Description |
| --- | --- | --- | --- |
| `get` | `key: string` | `Promise<string | null> | string | null` | Reads serialized entry. |
| `set` | `key: string`, `value: string` | `Promise<unknown> | unknown` | Writes serialized entry. |
| `del` | `key: string` | `Promise<unknown> | unknown` | Deletes entry. |
| `exists` | `key: string` | `Promise<number | boolean> | number | boolean` | Optional existence check. |

Returns `CacheStore`.

Alias: `createRedisCache`.

## Engine

### `PageMintAppOptions`

Core app and engine options.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `cache` | `CacheStore` | No | Cache adapter. If omitted, cached pages render without cache. |
| `now` | `() => number` | No | Clock function in milliseconds. Defaults to `Date.now`. |
| `onError` | `(error: unknown, context: PageMintErrorContext) => void` | No | Error hook. |

### `new PageMintEngine(options?)`

Creates the core engine without Hono.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `PageMintAppOptions` | No | Engine options. |
| `options.cache` | `CacheStore` | No | Cache adapter. |
| `options.now` | `() => number` | No | Clock function. |
| `options.onError` | `(error, context) => void` | No | Error hook. |

### `engine.registerPage(options)`

Registers a page with the engine.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `DefinePageOptions<TData>` | Yes | Page definition. |

Returns `RegisteredPage<TData>`.

### `engine.listPages()`

Returns registered pages.

Parameters: none.

Returns `RegisteredPage[]`.

### `engine.handlePage(page, ctx)`

Handles one already-matched page request.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `page` | `RegisteredPage<TData>` | Yes | Registered page. |
| `ctx` | `PageContext` | Yes | Page context. |

Returns `Promise<PageResponse>`.

### `engine.revalidate(pathOrUrl)`

Same behavior as `app.revalidate(pathOrUrl)`.

### `engine.revalidateByKey(key)`

Same behavior as `app.revalidateByKey(key)`.

### `engine.revalidateTag(tag)`

Same behavior as `app.revalidateTag(tag)`.

### `engine.invalidate(pathOrUrl)`

Same behavior as `app.invalidate(pathOrUrl)`.

### `engine.invalidateByKey(key)`

Same behavior as `app.invalidateByKey(key)`.

## Revalidator

### `new PageMintRevalidator(options)`

Creates a standalone background revalidator.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `PageMintRevalidatorOptions` | Yes | Revalidator options. |
| `options.cache` | `CacheStore` | No | Cache adapter. If omitted, tasks run as no-ops. |
| `options.now` | `() => number` | Yes | Clock function in milliseconds. |
| `options.onError` | `(error, context) => void` | No | Error hook. |

### `revalidator.register(task)`

Registers or replaces a task.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `task` | `RevalidatorTask<TData>` | Yes | Task definition. |
| `task.name` | `string` | Yes | Unique task name. Existing task with same name is replaced. |
| `task.interval` | `number` | Yes | Interval in milliseconds. Must be positive. |
| `task.check` | `() => RevalidateCheckResult<TData> \| Promise<RevalidateCheckResult<TData>>` | Yes | Checks external data and returns rebuild metadata. |
| `task.rebuild` | `(ctx: RevalidateRebuildContext<TData>) => PageRenderResult \| Promise<PageRenderResult>` | Yes | Renders new HTML when needed. |

Returns `void`.

### `revalidator.unregister(name)`

Unregisters a task and clears its timer.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Task name. |

Returns `void`.

### `revalidator.start()`

Starts timers for all registered tasks.

Parameters: none.

Returns `void`.

### `revalidator.stop()`

Stops all timers.

Parameters: none.

Returns `void`.

### `revalidator.run(name?)`

Runs one task or all tasks immediately.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | No | Task name. If omitted, all tasks run in parallel. |

Returns `Promise<void>`.

### `revalidator.list()`

Lists task names.

Parameters: none.

Returns `string[]`.

### `RevalidateCheckResult<TData>`

Returned by `task.check()`.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | Yes | Cache key to inspect or rebuild. |
| `hash` | `string` | No | External data fingerprint. If unchanged, metadata is refreshed without rendering. |
| `data` | `TData` | No | Data passed to `task.rebuild()`. |
| `ttl` | `number` | No | Fresh period for rebuilt entry. |
| `staleTtl` | `number` | No | Stale-serving period for rebuilt entry. |
| `headers` | `Record<string, string>` | No | Headers saved on rebuilt entry. |

### `RevalidateRebuildContext<TData>`

Passed to `task.rebuild()`.

| Field | Type | Description |
| --- | --- | --- |
| `key` | `string` | Cache key being rebuilt. |
| `data` | `TData | undefined` | Data returned by `check()`. |
| `hash` | `string | undefined` | Hash returned by `check()`. |
| `previousEntry` | `CacheEntry | null` | Previous cached entry. |

## Hashing

### `createDataHash(data)`

Creates a stable hash string for data.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `data` | `unknown` | Yes | Data to hash. |

Returns `string`.

### `stableStringify(value)`

Serializes values with sorted object keys.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `value` | `unknown` | Yes | Value to serialize. |

Returns `string`.

Notes:

- `Date` becomes ISO string.
- `URL` becomes string.
- `URLSearchParams` becomes sorted entries.
- `bigint` becomes string.
- Circular references become `"[Circular]"`.
- `undefined` and function fields are skipped in objects.

## Errors

### `PageMintError`

Framework error with context.

Constructor:

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `message` | `string` | Yes | Error message. |
| `context` | `PageMintErrorContext` | Yes | Error context. |
| `cause` | `unknown` | No | Original error. |

`PageMintErrorContext` fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `phase` | `'load' \| 'render' \| 'cache' \| 'revalidate' \| 'route'` | Yes | Failure phase. |
| `cacheKey` | `string` | No | Related cache key. |
| `pathname` | `string` | No | Related pathname. |
| `pagePath` | `string` | No | Related page route pattern or task name. |

## Actions

### `ActionButton(props)`

Server JSX helper that renders a `<button>` with `data-action` and optional `data-payload`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `action` | `string` | Yes | None | Action name. |
| `payload` | `unknown` | No | `undefined` | JSON-serialized into `data-payload` when provided. |
| `children` | `Child` | No | `undefined` | Button content. |
| `type` | `'button' \| 'submit' \| 'reset'` | No | `'button'` | Button type. |
| `class` | `string` | No | `undefined` | CSS class. |
| `id` | `string` | No | `undefined` | DOM id. |
| `disabled` | `boolean` | No | `undefined` | Disabled state. |
| `title` | `string` | No | `undefined` | Title attribute. |
| `data-*` | `unknown` | No | `undefined` | Extra data attributes. |
| `aria-*` | `unknown` | No | `undefined` | Extra ARIA attributes. |

Returns Hono JSX.

### `registerAction(name, handler)`

Registers a browser action handler.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Action name. |
| `handler` | `ActionHandler<TPayload>` | Yes | Handler called when matching action is dispatched. |

Returns `void`.

### `unregisterAction(name)`

Removes one action handler.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Action name. |

Returns `void`.

### `clearActions()`

Removes all action handlers.

Parameters: none.

Returns `void`.

### `getAction(name)`

Reads one action handler.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Action name. |

Returns `ActionHandler | undefined`.

### `listActions()`

Lists registered action names and handlers.

Parameters: none.

Returns `RegisteredAction[]`.

### `dispatchAction(ctx)`

Runs one registered action handler and dispatches lifecycle DOM events.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `ctx` | `ActionContext<TPayload>` | Yes | Dispatch context. |
| `ctx.action` | `string` | Yes | Action name. |
| `ctx.payload` | `TPayload` | Yes | Parsed payload. |
| `ctx.el` | `HTMLElement` | Yes | Element that triggered the action. |
| `ctx.event` | `Event` | No | Original DOM event. |

Returns `Promise<unknown>`.

Lifecycle events:

| Event | Detail |
| --- | --- |
| `pagemint:action-start` | `{ action, payload }` |
| `pagemint:action-end` | `{ action, payload, result }` |
| `pagemint:action-error` | `{ action, payload, error }` |

### `installActionRuntime(options?)`

Installs delegated click handling for `[data-action]`.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `options` | `ActionRuntimeOptions` | No | `{}` | Runtime options. |
| `options.root` | `Document \| HTMLElement` | No | `globalThis.document` | Root element for click delegation. |
| `options.preventDefault` | `boolean` | No | `true` | Whether to call `event.preventDefault()` before dispatch. |

Returns a cleanup function `() => void`.

The runtime auto-installs when `document` exists.

## CLI

### `create-pagemint <name>`

Scaffolds a new PageMint project.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Target directory and package name. Directory must not already contain files. |

Generated next steps:

```bash
cd <name>
pnpm install
pnpm dev
```

## SDK Configuration And Assets

These Node-only APIs are exported from `@pagemint/core/node` and re-exported from `@pagemint/hono/node`. They read files or environment variables, so keep them out of browser, edge, and Cloudflare Worker runtime imports.

### `definePageMintConfig(config)`

Defines and returns a typed config object. The function does not resolve defaults or read environment variables; use it to preserve type inference for committed config files.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `config` | `TConfig extends object` | Yes | Config object to return unchanged. |

Returns `TConfig`.

The PC app wraps this API with its own `PageMintConfig` type in `apps/pc/src/config/define-config.ts`.

### `createEnvLoader(defaultOptions?)`

Creates an isolated environment-file loader with its own cache.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `defaultOptions` | `LoadEnvOptions` | No | Default loader options used whenever the returned loader is called. |
| `defaultOptions.cwd` | `string` | No | Directory to read env files from. Defaults to `process.cwd()`. |
| `defaultOptions.appEnv` | `string` | No | Environment name used for `.env.${appEnv}` files. Defaults to `APP_ENV`, then `NODE_ENV`, then `development`. |
| `defaultOptions.files` | `string[]` | No | Explicit file list. Defaults to `.env`, `.env.${appEnv}`, `.env.local`, `.env.${appEnv}.local`. |

Returns `(options?: LoadEnvOptions) => LoadedEnv`.

The returned loader accepts the same `LoadEnvOptions` fields. Call-time options override `defaultOptions`.

Real process environment variables are not overwritten by env files. Later env files can override values loaded by earlier env files.

### `loadEnvFiles(options?)`

Loads environment files into `process.env` using the default SDK loader.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `LoadEnvOptions` | No | Loader options. |
| `options.cwd` | `string` | No | Directory to read env files from. Defaults to `process.cwd()`. |
| `options.appEnv` | `string` | No | Environment name used for `.env.${appEnv}` files. Defaults to `APP_ENV`, then `NODE_ENV`, then `development`. |
| `options.files` | `string[]` | No | Explicit file list. Defaults to `.env`, `.env.${appEnv}`, `.env.local`, `.env.${appEnv}.local`. |

Returns `LoadedEnv`.

### `envValue(name)`

Reads and trims one environment variable.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Environment variable name. |

Returns `string`. Missing values return an empty string.

### `createPageMintConfigLoader(options)`

Creates a cached config loader from a raw config object, an env loader scope, a defaults function, and a final resolver.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `CreatePageMintConfigLoaderOptions<TConfig, TResolvedConfig>` | Yes | Loader definition. |
| `options.rawConfig` | `TConfig` | Yes | Committed raw config object. |
| `options.env` | `LoadEnvOptions` | No | Env-file options passed to `createEnvLoader()`. |
| `options.withDefaults` | `(config: TConfig) => TResolvedConfig` | Yes | Applies config-file defaults before env overrides. |
| `options.resolve` | `(context: PageMintConfigLoaderContext<TConfig, TResolvedConfig>) => TResolvedConfig` | Yes | Applies env overrides and final validation. |

Returns `() => TResolvedConfig`.

`PageMintConfigLoaderContext` fields:

| Field | Type | Description |
| --- | --- | --- |
| `rawConfig` | `TConfig` | The raw committed config object. |
| `config` | `TResolvedConfig` | The value returned by `withDefaults()`. |
| `loadedEnv` | `LoadedEnv` | Env-file loading result. |
| `envValue` | `(name: string) => string` | Helper for reading trimmed environment variables. |

The returned loader caches the resolved config after the first call.

### `loadViteManifest(manifestPath)`

Reads and parses a Vite manifest JSON file.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `manifestPath` | `string \| URL` | Yes | Path or file URL to Vite `manifest.json`. |

Returns `ViteManifest`.

### `resolveViteClientAssets(viteManifest, options)`

Converts a parsed Vite manifest entry into a PageMint client manifest plus stylesheet hrefs.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `viteManifest` | `ViteManifest` | Yes | Parsed Vite manifest. |
| `options` | `Omit<LoadViteClientAssetsOptions, 'manifestPath' \| 'missingManifestMessage'>` | Yes | Entry resolution options. |
| `options.moduleId` | `string` | Yes | PageMint client module id to create. |
| `options.entryKey` | `string` | No | Exact Vite manifest key to use first. |
| `options.entryName` | `string` | No | Vite entry `name` to match when `isEntry` is true. |
| `options.entrySrc` | `string` | No | Vite entry `src` to match when `isEntry` is true, also used as a manifest-key fallback. |
| `options.publicPath` | `string` | No | Public URL prefix for generated asset hrefs. Defaults to `/static/`. |
| `options.missingEntryMessage` | `string` | No | Error message used when the entry cannot be found. |

Returns `ViteClientAssets`.

`ViteClientAssets` fields:

| Field | Type | Description |
| --- | --- | --- |
| `manifest` | `ClientManifest` | Manifest passed to `ClientScripts`. |
| `styles` | `string[]` | Stylesheet hrefs collected from the entry and imported chunks. |
| `entry` | `ViteManifestChunk` | Matched Vite manifest chunk. |

### `loadViteClientAssets(options)`

Reads a Vite manifest file and resolves one client entry.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `LoadViteClientAssetsOptions` | Yes | Manifest path and entry resolution options. |
| `options.manifestPath` | `string \| URL` | Yes | Path or file URL to Vite `manifest.json`. |
| `options.moduleId` | `string` | Yes | PageMint client module id to create. |
| `options.entryKey` | `string` | No | Exact Vite manifest key to use first. |
| `options.entryName` | `string` | No | Vite entry `name` to match. |
| `options.entrySrc` | `string` | No | Vite entry `src` to match. |
| `options.publicPath` | `string` | No | Public URL prefix for generated asset hrefs. Defaults to `/static/`. |
| `options.missingManifestMessage` | `(error: unknown) => string` | No | Converts manifest read/parse errors into a custom message. |
| `options.missingEntryMessage` | `string` | No | Error message used when the entry cannot be found. |

Returns `ViteClientAssets`.

### `createViteClientAssetsLoader(options)`

Creates a cached loader around `loadViteClientAssets()`.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `LoadViteClientAssetsOptions` | Yes | Same options accepted by `loadViteClientAssets()`. |

Returns `() => ViteClientAssets`.

### `collectViteCss(manifest, chunk, seen?)`

Collects CSS files from a Vite chunk and its imported chunks.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `manifest` | `ViteManifest` | Yes | Parsed Vite manifest. |
| `chunk` | `ViteManifestChunk` | Yes | Chunk to start from. |
| `seen` | `Set<string>` | No | Internal recursion guard. Usually omit. |

Returns `string[]`.

### `viteClientShimScript(assets, moduleId)`

Generates a small compatibility script that appends Vite-built stylesheet links and a module script to the current document.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `assets` | `Pick<ViteClientAssets, 'manifest' \| 'styles'>` | Yes | Resolved Vite client assets. |
| `moduleId` | `string` | Yes | Client module id whose first script should be loaded. |

Returns `string`.

New pages should prefer `ClientScripts` plus explicit stylesheet links. Use this shim only for legacy script URLs such as `/static/fanke-client.js`.

## PC App Configuration

The PC app composes the SDK APIs above with app-specific Fanke fields.

`PageMintConfig` fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `appEnv` | `string` | No | Default app environment. |
| `server.port` | `number` | No | Default HTTP port. |
| `cache.driver` | `'memory' \| 'file' \| 'redis'` | No | Reserved cache driver setting. Current PC app still creates the memory cache. |
| `cache.fileDir` | `string` | No | Reserved file cache directory. |
| `database.url` | `string` | No | Reserved database URL. No database dependency is installed. |
| `redis.url` | `string` | No | Reserved Redis URL. No Redis client dependency is installed. |
| `client.modules` | `string[]` | No | PC app client module ids loaded by `ClientScripts`. Defaults to `['pc:fanke']`. |
| `client.scripts` | `ClientScriptInput[]` | No | Extra external or already-built browser scripts appended after configured modules. |
| `styles.input` | `string` | No | Style entry file. Defaults to `src/styles/app.css`. |
| `styles.output` | `string` | No | Vite-generated static CSS file. Defaults to `src/static/tailwind.css`. |
| `styles.engine` | `'tailwind'` | No | Style compiler. Defaults to `'tailwind'`. |
| `thirdParty.fanke.publicApiBaseUrl` | `string` | No | Browser-visible Fanke API base path. |
| `thirdParty.fanke.serverApiBaseUrl` | `string` | No | Server-only Fanke backend URL. |
| `thirdParty.fanke.publicApiKey` | `string` | No | Browser-visible Fanke AES key for the current integration. |
| `thirdParty.fanke.mmsAppId` | `string` | No | Server-only Fanke account QR salt/app id. |
| `thirdParty.fanke.publicBncImageKey` | `string` | No | Browser-visible Fanke image key. |
| `thirdParty.fanke.publicCdnBaseUrl` | `string` | No | Browser-visible CDN base URL. |
| `thirdParty.fanke.publicSiteUrl` | `string` | No | Browser-visible site URL. |
| `thirdParty.fanke.publicPcSiteUrl` | `string` | No | Browser-visible PC site URL. |
| `thirdParty.fanke.publicH5SiteUrl` | `string` | No | Browser-visible H5 site URL. |

### `loadAppConfig()`

Loads environment files and resolves the final PC app config.

Parameters: none.

Returns `ResolvedPageMintConfig`.

Environment overrides:

| Environment Variable | Target Field | Validation |
| --- | --- | --- |
| `APP_ENV` | `appEnv` | None. |
| `PORT` | `server.port` | Integer from `1` to `65535`. |
| `DATABASE_URL` | `database.url` | None. Reserved only. |
| `REDIS_URL` | `redis.url` | None. Reserved only. |
| `PAGEMINT_PUBLIC_FANKE_API_BASE_URL` | `thirdParty.fanke.publicApiBaseUrl` | None. |
| `PAGEMINT_FANKE_SERVER_API_BASE_URL` | `thirdParty.fanke.serverApiBaseUrl` | Checked by Fanke API calls when used. |
| `PAGEMINT_PUBLIC_FANKE_API_KEY` | `thirdParty.fanke.publicApiKey` | Checked by Fanke API calls when used. |
| `PAGEMINT_FANKE_MMS_APPID` | `thirdParty.fanke.mmsAppId` | None. |
| `PAGEMINT_PUBLIC_FANKE_BNC_IMAGE_KEY` | `thirdParty.fanke.publicBncImageKey` | None. |
| `PAGEMINT_PUBLIC_FANKE_CDN_BASE_URL` | `thirdParty.fanke.publicCdnBaseUrl` | None. |
| `PAGEMINT_PUBLIC_FANKE_SITE_URL` | `thirdParty.fanke.publicSiteUrl` | None. |
| `PAGEMINT_PUBLIC_FANKE_PC_SITE_URL` | `thirdParty.fanke.publicPcSiteUrl` | None. |
| `PAGEMINT_PUBLIC_FANKE_H5_SITE_URL` | `thirdParty.fanke.publicH5SiteUrl` | None. |

`client.modules`, `client.scripts`, and `styles` are config-file settings only. They are not read from environment variables because they describe browser asset composition, not per-environment secrets.

`loadAppConfig()` also resolves `styles.href` from `styles.output`. For the default output `src/static/tailwind.css`, the href is `/static/tailwind.css`. The PC app layout reads the actual rendered styles from Vite manifest through `pcClientStyles()`, so `styles.href` is kept for tooling and compatibility.

The PC app asset build uses `styles.input`, `styles.output`, `src/static/pc.css`, and `src/client/fanke/main.js` as Vite inputs. It writes:

| Output | Description |
| --- | --- |
| `src/static/tailwind.css` | Minified CSS generated by Vite. |
| `src/static/build/assets/*.js` | Minified client JavaScript and imported browser assets. |
| `src/static/.vite/manifest.json` | Manifest consumed by `pcClientManifest` and `pcClientStyles()`. |

### `pcClientManifest`

Prebuilt PC app client manifest exported from `apps/pc/src/client/manifest.ts`.

Parameters: none.

Returns `ClientManifest`.

The manifest currently exposes:

| Module | Description |
| --- | --- |
| `pc:fanke` | Vite-built Fanke PC browser interaction entry. |

### `loadPcClientAssets()`

Reads Vite manifest output and returns the browser assets needed by the PC layout.

Parameters: none.

Returns `PcClientAssets`.

`PcClientAssets` fields:

| Field | Type | Description |
| --- | --- | --- |
| `manifest` | `ClientManifest` | Manifest passed into `ClientScripts`. |
| `styles` | `string[]` | Stylesheet hrefs collected from Vite manifest CSS entries and imported chunks. |

Throws if `src/static/.vite/manifest.json` is missing or does not contain the `fanke-client` entry. Run `pnpm --filter @pagemint/app-pc run assets:build` before starting the app.

### `pcClientStyles()`

Returns stylesheet hrefs for the PC client entry.

Parameters: none.

Returns `string[]`.

### `pcClientShimScript()`

Returns a small compatibility script used by `/static/fanke-client.js`.

Parameters: none.

Returns `string`.

The script appends the Vite-built stylesheet links and module script to the current document. New pages should prefer `pcClientManifest` and `pcClientStyles()` directly.
