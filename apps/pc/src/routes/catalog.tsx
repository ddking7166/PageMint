import { definePage, joinCacheKey } from '@pagemint/hono'

import {
  getChannelData,
  getMovieFilter,
  getSportsLiveList,
  getSystemInfo,
  searchMovies,
} from '../lib/fanke-api.js'
import { parseStaticFilterSegments } from '../lib/seo-static-routes.js'
import { ChannelPage } from '../pages/ChannelPage.js'
import { CollectionPage } from '../pages/CollectionPage.js'
import { LivePage } from '../pages/LivePage.js'
import { MovieCatalogPage, normalizeCatalogQuery } from '../pages/MovieCatalogPage.js'
import {
  createPcContext,
  firstQuery,
  queryCacheKey,
  resolvePlaylist,
  scopedQueryCacheKey,
  slugLabel,
  textFromStaticQuery,
  wildcardSegments,
} from './helpers.js'

import type { PageContext, PageMintHonoApp } from '@pagemint/hono'
import type { AnyRecord } from '../lib/records.js'

type CatalogPageData = {
  systemInfo: AnyRecord
  filterList: AnyRecord[]
  result: AnyRecord
  query: AnyRecord
  title: string
  basePath?: string
  forceFilters?: boolean
}

export function registerCatalogRoutes(app: PageMintHonoApp): void {
  app.page(
    definePage<CatalogPageData>({
      path: '/channel',
      cache: {
        ttl: 60_000,
        staleTtl: 5 * 60_000,
        key: ({ query }) => queryCacheKey(joinCacheKey('pc', 'channel'), query),
        tags: ['pc:catalog', 'pc:channel'],
      },
      async load({ request, query }) {
        return loadCatalogPage({ request, query }, {
          title: '片库',
          basePath: '/channel',
          forceFilters: false,
        })
      },
      render({ data }) {
        return <MovieCatalogPage {...data} />
      },
    }),
  )

  app.page(
    definePage<CatalogPageData>({
      path: '/channel/filter/*',
      cache: {
        ttl: 60_000,
        staleTtl: 5 * 60_000,
        key: ({ params, query }) => scopedQueryCacheKey(joinCacheKey('pc', 'channel', 'filter'), query, params['*']),
        tags: ['pc:catalog', 'pc:channel'],
      },
      async load(ctx) {
        const staticQuery = parseStaticFilterSegments(wildcardSegments(ctx))
        return loadCatalogPage(ctx, {
          staticQuery,
          title: textFromStaticQuery(staticQuery),
          basePath: '/channel',
        })
      },
      render({ data }) {
        return <MovieCatalogPage {...data} />
      },
    }),
  )

  app.page(
    definePage<{ systemInfo: AnyRecord; data: AnyRecord; title: string; other: boolean; mode: 'channel' | 'search'; query?: AnyRecord }>({
      path: '/channel/:position',
      cache: {
        ttl: 60_000,
        staleTtl: 5 * 60_000,
        key: ({ params }) => joinCacheKey('pc', 'channel', params.position),
        tags: ({ params }) => ['pc:channel', joinCacheKey('pc', 'channel', params.position)],
      },
      async load({ request, params }) {
        const context = createPcContext(request)
        const systemInfo = await getSystemInfo(context)
        const title = String(systemInfo.movie_position?.[params.position] || params.position)
        if (!systemInfo.movie_position?.[params.position]) {
          const query = normalizeCatalogQuery({ keywords: params.position, is_search: '1' })
          const data = await searchMovies(query, context)
          return { systemInfo, data, title: `搜索：${params.position}`, other: false, mode: 'search' as const, query }
        }
        const data = await getChannelData(params.position, context)
        return { systemInfo, data, title, other: params.position === 'js' || params.position === 'music', mode: 'channel' as const }
      },
      render({ data }) {
        if (data.mode === 'search') {
          return (
            <MovieCatalogPage
              title={data.title}
              systemInfo={data.systemInfo}
              filterList={[]}
              result={data.data}
              query={data.query || {}}
              basePath="/channel"
            />
          )
        }
        return <ChannelPage title={data.title} systemInfo={data.systemInfo} data={data.data} other={data.other} />
      },
    }),
  )

  registerCategoryRoutes(app)
  registerTagRoutes(app)
  registerLiveRoutes(app)
  registerCollectionRoutes(app)
}

function registerCategoryRoutes(app: PageMintHonoApp): void {
  app.page(
    definePage<CatalogPageData>({
      path: '/category/:id',
      cache: {
        ttl: 60_000,
        staleTtl: 5 * 60_000,
        key: ({ params, query }) => scopedQueryCacheKey(joinCacheKey('pc', 'category'), query, params.id),
        tags: ({ params }) => ['pc:catalog', 'pc:category', joinCacheKey('pc', 'category', params.id)],
      },
      async load({ request, params, query }) {
        return loadCatalogPage({ request, query }, {
          overrides: { cat_id: params.id },
          title: slugLabel(params.id),
          basePath: `/category/${params.id}`,
        })
      },
      render({ data }) {
        return <MovieCatalogPage {...data} />
      },
    }),
  )

  app.page(
    definePage<CatalogPageData>({
      path: '/category/:id/:slug',
      cache: {
        ttl: 60_000,
        staleTtl: 5 * 60_000,
        key: ({ params, query }) => scopedQueryCacheKey(joinCacheKey('pc', 'category'), query, params.id),
        tags: ({ params }) => ['pc:catalog', 'pc:category', joinCacheKey('pc', 'category', params.id)],
      },
      async load({ request, params, query }) {
        return loadCatalogPage({ request, query }, {
          overrides: { cat_id: params.id },
          title: slugLabel(params.slug || params.id),
          basePath: `/category/${params.id}/${params.slug}`,
        })
      },
      render({ data }) {
        return <MovieCatalogPage {...data} />
      },
    }),
  )

  app.page(
    definePage<CatalogPageData>({
      path: '/category/:id/:slug/*',
      cache: {
        ttl: 60_000,
        staleTtl: 5 * 60_000,
        key: ({ params, query }) => scopedQueryCacheKey(joinCacheKey('pc', 'category'), query, params.id, params['*']),
        tags: ({ params }) => ['pc:catalog', 'pc:category', joinCacheKey('pc', 'category', params.id)],
      },
      async load(ctx) {
        const { params } = ctx
        return loadCatalogPage(ctx, {
          staticQuery: parseStaticFilterSegments(wildcardSegments(ctx)),
          overrides: { cat_id: params.id },
          title: slugLabel(params.slug || params.id),
          basePath: `/category/${params.id}/${params.slug}`,
        })
      },
      render({ data }) {
        return <MovieCatalogPage {...data} />
      },
    }),
  )
}

function registerTagRoutes(app: PageMintHonoApp): void {
  app.page(
    definePage<CatalogPageData>({
      path: '/tag/:id',
      cache: {
        ttl: 60_000,
        staleTtl: 5 * 60_000,
        key: ({ params, query }) => scopedQueryCacheKey(joinCacheKey('pc', 'tag'), query, params.id),
        tags: ({ params }) => ['pc:catalog', 'pc:tag', joinCacheKey('pc', 'tag', params.id)],
      },
      async load({ request, params, query }) {
        return loadCatalogPage({ request, query }, {
          overrides: { tag_id: params.id },
          title: `${slugLabel(params.id)}标签`,
          basePath: `/tag/${params.id}`,
        })
      },
      render({ data }) {
        return <MovieCatalogPage {...data} />
      },
    }),
  )

  app.page(
    definePage<CatalogPageData>({
      path: '/tag/:id/:slug',
      cache: {
        ttl: 60_000,
        staleTtl: 5 * 60_000,
        key: ({ params, query }) => scopedQueryCacheKey(joinCacheKey('pc', 'tag'), query, params.id),
        tags: ({ params }) => ['pc:catalog', 'pc:tag', joinCacheKey('pc', 'tag', params.id)],
      },
      async load({ request, params, query }) {
        return loadCatalogPage({ request, query }, {
          overrides: { tag_id: params.id },
          title: `${slugLabel(params.slug || params.id)}标签`,
          basePath: `/tag/${params.id}/${params.slug}`,
        })
      },
      render({ data }) {
        return <MovieCatalogPage {...data} />
      },
    }),
  )

  app.page(
    definePage<CatalogPageData>({
      path: '/tag/:id/:slug/*',
      cache: {
        ttl: 60_000,
        staleTtl: 5 * 60_000,
        key: ({ params, query }) => scopedQueryCacheKey(joinCacheKey('pc', 'tag'), query, params.id, params['*']),
        tags: ({ params }) => ['pc:catalog', 'pc:tag', joinCacheKey('pc', 'tag', params.id)],
      },
      async load(ctx) {
        const { params } = ctx
        return loadCatalogPage(ctx, {
          staticQuery: parseStaticFilterSegments(wildcardSegments(ctx)),
          overrides: { tag_id: params.id },
          title: `${slugLabel(params.slug || params.id)}标签`,
          basePath: `/tag/${params.id}/${params.slug}`,
        })
      },
      render({ data }) {
        return <MovieCatalogPage {...data} />
      },
    }),
  )
}

function registerLiveRoutes(app: PageMintHonoApp): void {
  app.page(
    definePage<{ systemInfo: AnyRecord; result: AnyRecord; query: AnyRecord }>({
      path: '/live',
      cache: {
        ttl: 30_000,
        staleTtl: 60_000,
        key: ({ query }) => queryCacheKey(joinCacheKey('pc', 'live'), query),
        tags: ['pc:live'],
      },
      async load({ request, query }) {
        const context = createPcContext(request)
        const raw = firstQuery(query)
        const liveQuery = {
          type: raw.type || '',
          status: '1',
          page: raw.page || '1',
          page_size: raw.page_size || '60',
          match: raw.match || '',
        }
        const [systemInfo, result] = await Promise.all([
          getSystemInfo(context),
          getSportsLiveList(liveQuery, context),
        ])
        return { systemInfo, result, query: liveQuery }
      },
      render({ data }) {
        return <LivePage systemInfo={data.systemInfo} result={data.result} query={data.query} />
      },
    }),
  )
}

function registerCollectionRoutes(app: PageMintHonoApp): void {
  app.page(
    definePage<{ systemInfo: AnyRecord; playlist: AnyRecord }>({
      path: '/collection/:id',
      cache: {
        ttl: 60_000,
        staleTtl: 5 * 60_000,
        key: ({ params }) => joinCacheKey('pc', 'collection', params.id),
        tags: ({ params }) => ['pc:collection', joinCacheKey('pc', 'collection', params.id)],
      },
      async load({ request, params }) {
        const context = createPcContext(request)
        const [systemInfo, playlist] = await Promise.all([
          getSystemInfo(context),
          resolvePlaylist(params.id, context),
        ])
        return { systemInfo, playlist: playlist || {} }
      },
      render({ data }) {
        return <CollectionPage systemInfo={data.systemInfo} playlist={data.playlist} />
      },
    }),
  )
}

async function loadCatalogPage(
  ctx: Pick<PageContext, 'request' | 'query'>,
  options: {
    staticQuery?: AnyRecord
    overrides?: AnyRecord
    title: string
    basePath: string
    forceFilters?: boolean
  },
): Promise<CatalogPageData> {
  const context = createPcContext(ctx.request)
  const catalogQuery = normalizeCatalogQuery({ ...(options.staticQuery || {}), ...firstQuery(ctx.query) }, options.overrides)
  const [systemInfo, filterList, result] = await Promise.all([
    getSystemInfo(context),
    getMovieFilter(catalogQuery, context),
    searchMovies(catalogQuery, context),
  ])
  return {
    systemInfo,
    filterList,
    result,
    query: catalogQuery,
    title: options.title,
    basePath: options.basePath,
    forceFilters: options.forceFilters ?? true,
  }
}
