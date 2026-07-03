import { definePage, joinCacheKey, redirect } from '@pagemint/hono'

import {
  getMovieDetail,
  getMovieRank,
  getSystemInfo,
} from '../lib/fanke-api.js'
import { DetailPage } from '../pages/DetailPage.js'
import { MovieRankPage } from '../pages/MovieRankPage.js'
import { createPcContext } from './helpers.js'

import type { PageMintHonoApp } from '@pagemint/hono'
import type { AnyRecord } from '../lib/records.js'

type DetailPageData = {
  systemInfo: AnyRecord
  detail: AnyRecord
}

type ListPageData = {
  systemInfo: AnyRecord
  items: AnyRecord[]
}

export function registerMovieRoutes(app: PageMintHonoApp): void {
  app.page(
    definePage<Record<string, never>>({
      path: '/movie/search',
      load() {
        return {}
      },
      render() {
        return redirect('/channel')
      },
    }),
  )

  app.page(
    definePage<DetailPageData>({
      path: '/movie/detail/:id',
      cache: {
        ttl: 5 * 60_000,
        staleTtl: 30 * 60_000,
        key: ({ params, query }) => movieDetailCacheKey(params.id, query),
        tags: ({ params }) => ['pc:movie', joinCacheKey('pc', 'movie', params.id)],
        hash: ({ detail }) => JSON.stringify({
          id: detail.id ?? detail.movie_id,
          link: detail.link_id ?? '',
          updated: detail.updated_at ?? detail.update_time ?? detail.modified_time ?? '',
        }),
      },
      async load({ request, params, query }) {
        const context = createPcContext(request)
        const detailQuery = Object.fromEntries(query)
        const [systemInfo, detail] = await Promise.all([
          getSystemInfo(context),
          getMovieDetail(params.id, context, detailQuery),
        ])
        return { systemInfo, detail }
      },
      render({ data }) {
        return <DetailPage systemInfo={data.systemInfo} detail={data.detail} />
      },
    }),
  )

  app.page(
    definePage<ListPageData>({
      path: '/movie/rank',
      cache: {
        ttl: 60_000,
        staleTtl: 5 * 60_000,
        key: () => joinCacheKey('pc', 'rank', 'movie'),
        tags: ['pc:rank', joinCacheKey('pc', 'rank', 'movie')],
      },
      async load({ request }) {
        const context = createPcContext(request)
        const [systemInfo, items] = await Promise.all([
          getSystemInfo(context),
          getMovieRank('movie', context),
        ])
        return { systemInfo, items }
      },
      render({ data }) {
        return <MovieRankPage systemInfo={data.systemInfo} items={data.items} code="movie" />
      },
    }),
  )

  app.page(
    definePage<ListPageData>({
      path: '/movie/rank/:code',
      cache: {
        ttl: 60_000,
        staleTtl: 5 * 60_000,
        key: ({ params }) => joinCacheKey('pc', 'rank', params.code),
        tags: ({ params }) => ['pc:rank', joinCacheKey('pc', 'rank', params.code)],
      },
      async load({ request, params }) {
        const context = createPcContext(request)
        const [systemInfo, items] = await Promise.all([
          getSystemInfo(context),
          getMovieRank(params.code, context),
        ])
        return { systemInfo, items }
      },
      render({ data, params }) {
        return <MovieRankPage systemInfo={data.systemInfo} items={data.items} code={params.code} />
      },
    }),
  )

  app.page(
    definePage<DetailPageData>({
      path: '/movie/:id/:slug',
      cache: {
        ttl: 5 * 60_000,
        staleTtl: 30 * 60_000,
        key: ({ params, query }) => movieDetailCacheKey(params.id, query),
        tags: ({ params }) => ['pc:movie', joinCacheKey('pc', 'movie', params.id)],
      },
      async load({ request, params, query }) {
        const context = createPcContext(request)
        const detailQuery = Object.fromEntries(query)
        const [systemInfo, detail] = await Promise.all([
          getSystemInfo(context),
          getMovieDetail(params.id, context, detailQuery),
        ])
        return { systemInfo, detail }
      },
      render({ data }) {
        return <DetailPage systemInfo={data.systemInfo} detail={data.detail} />
      },
    }),
  )
}

function movieDetailCacheKey(id: string, query: URLSearchParams): string {
  const linkId = query.get('link_id') || ''
  return linkId
    ? joinCacheKey('pc', 'movie', id, 'link', linkId)
    : joinCacheKey('pc', 'movie', id)
}
