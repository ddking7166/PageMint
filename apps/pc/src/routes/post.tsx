import { definePage, joinCacheKey, redirect } from '@pagemint/hono'

import {
  getArticleDetail,
  getComments,
  getPostDetail,
  getRankDetail,
  getRankList,
  getSystemInfo,
  searchPosts,
} from '../lib/fanke-api.js'
import {
  ArticleDetailPage,
  PostDetailPage,
  PostListPage,
  PostRankDetailPage,
  PostRankPage,
} from '../pages/PostPages.js'
import {
  createPcContext,
  firstQuery,
  queryCacheKey,
  scopedQueryCacheKey,
  textFromStaticQuery,
} from './helpers.js'

import type { PageMintHonoApp } from '@pagemint/hono'
import type { AnyRecord } from '../lib/records.js'

export function registerPostRoutes(app: PageMintHonoApp): void {
  app.page(
    definePage<{ systemInfo: AnyRecord; data: AnyRecord; title: string }>({
      path: '/post/list/:catId',
      cache: {
        ttl: 60_000,
        staleTtl: 5 * 60_000,
        key: ({ params, query }) => scopedQueryCacheKey(joinCacheKey('pc', 'post', 'list'), query, params.catId),
        tags: ({ params }) => ['pc:post', 'pc:post:list', joinCacheKey('pc', 'post', 'list', params.catId)],
      },
      async load({ request, params, query }) {
        const context = createPcContext(request)
        const page = Number(firstQuery(query).page || 1)
        const [systemInfo, data] = await Promise.all([
          getSystemInfo(context),
          searchPosts({ cat_id: params.catId }, page, context),
        ])
        return { systemInfo, data, title: textFromStaticQuery({ cat_id: data.cat_name || params.catId }) }
      },
      render({ data }) {
        return <PostListPage systemInfo={data.systemInfo} data={data.data} title={data.title} />
      },
    }),
  )

  app.page(
    definePage<{ systemInfo: AnyRecord; data: AnyRecord; title: string }>({
      path: '/post/search/:w',
      cache: {
        ttl: 60_000,
        staleTtl: 5 * 60_000,
        key: ({ params, query }) => scopedQueryCacheKey(joinCacheKey('pc', 'post', 'search'), query, params.w),
        tags: ['pc:post', 'pc:post:search'],
      },
      async load({ request, params, query }) {
        const context = createPcContext(request)
        const page = Number(firstQuery(query).page || 1)
        const [systemInfo, data] = await Promise.all([
          getSystemInfo(context),
          searchPosts({ keywords: params.w }, page, context),
        ])
        return { systemInfo, data, title: `搜索：${params.w}` }
      },
      render({ data }) {
        return <PostListPage systemInfo={data.systemInfo} data={data.data} title={data.title} />
      },
    }),
  )

  app.page(
    definePage<{ systemInfo: AnyRecord; rank: AnyRecord }>({
      path: '/post/rank',
      cache: {
        ttl: 60_000,
        staleTtl: 5 * 60_000,
        key: ({ query }) => queryCacheKey(joinCacheKey('pc', 'post', 'rank'), query),
        tags: ['pc:post', 'pc:post:rank'],
      },
      async load({ request, query }) {
        const context = createPcContext(request)
        const page = Number(firstQuery(query).page || 1)
        const [systemInfo, rank] = await Promise.all([
          getSystemInfo(context),
          getRankList(page, context),
        ])
        return { systemInfo, rank }
      },
      render({ data }) {
        return <PostRankPage systemInfo={data.systemInfo} rank={data.rank} />
      },
    }),
  )

  app.page(
    definePage<{ systemInfo: AnyRecord; detail: AnyRecord }>({
      path: '/post/rankDetail/:id',
      cache: {
        ttl: 60_000,
        staleTtl: 5 * 60_000,
        key: ({ params }) => joinCacheKey('pc', 'post', 'rankDetail', params.id),
        tags: ({ params }) => ['pc:post', 'pc:post:rankDetail', joinCacheKey('pc', 'post', 'rankDetail', params.id)],
      },
      async load({ request, params }) {
        const context = createPcContext(request)
        const [systemInfo, detail] = await Promise.all([
          getSystemInfo(context),
          getRankDetail(params.id, context),
        ])
        return { systemInfo, detail }
      },
      render({ data }) {
        return <PostRankDetailPage systemInfo={data.systemInfo} detail={data.detail} />
      },
    }),
  )

  app.page(
    definePage<{ systemInfo: AnyRecord; post: AnyRecord; comments: AnyRecord[] }>({
      path: '/post/detail/:id',
      async load({ request, params }) {
        const context = createPcContext(request)
        const [systemInfo, post, comments] = await Promise.all([
          getSystemInfo(context),
          getPostDetail(params.id, context),
          getComments(params.id, 'post', context),
        ])
        return { systemInfo, post, comments }
      },
      render({ data }) {
        return <PostDetailPage systemInfo={data.systemInfo} post={data.post} comments={data.comments} />
      },
    }),
  )

  app.page(
    definePage<{ systemInfo: AnyRecord; article: AnyRecord }>({
      path: '/article/detail/:id',
      async load({ request, params }) {
        const context = createPcContext(request)
        const [systemInfo, article] = await Promise.all([
          getSystemInfo(context),
          getArticleDetail(params.id, context),
        ])
        return { systemInfo, article }
      },
      render({ data }) {
        if (data.article.jump_url) return redirect(String(data.article.jump_url))
        return <ArticleDetailPage systemInfo={data.systemInfo} article={data.article} />
      },
    }),
  )
}
