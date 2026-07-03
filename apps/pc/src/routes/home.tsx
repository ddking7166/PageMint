import { definePage, joinCacheKey } from '@pagemint/hono'

import {
  getHomeData,
  getSystemInfo,
} from '../lib/fanke-api.js'
import { HomePage } from '../pages/HomePage.js'
import { PdfPage } from '../pages/PdfPage.js'
import { createPcContext } from './helpers.js'

import type { PageMintHonoApp } from '@pagemint/hono'
import type { AnyRecord } from '../lib/records.js'

type HomePageData = {
  systemInfo: AnyRecord
  data: AnyRecord
}

export function registerHomeRoutes(app: PageMintHonoApp): void {
  app.page(
    definePage<HomePageData>({
      path: '/',
      cache: {
        ttl: 60_000,
        staleTtl: 5 * 60_000,
        key: () => joinCacheKey('pc', 'home'),
        tags: ['pc:home'],
        hash: ({ systemInfo, data }) => JSON.stringify({
          site: systemInfo.site_name,
          banners: data.banner?.length ?? 0,
          updated: data.updated_at ?? data.update_time ?? '',
        }),
      },
      async load({ request }) {
        const context = createPcContext(request)
        const [systemInfo, data] = await Promise.all([
          getSystemInfo(context),
          getHomeData(context),
        ])
        return { systemInfo, data }
      },
      render({ data }) {
        return <HomePage systemInfo={data.systemInfo} data={data.data} />
      },
    }),
  )

  app.page(
    definePage<{ systemInfo: AnyRecord }>({
      path: '/pdf',
      cache: {
        ttl: 30_000,
        staleTtl: 60_000,
        key: () => joinCacheKey('pc', 'pdf'),
        tags: ['pc:pdf'],
      },
      async load({ request }) {
        const context = createPcContext(request)
        const systemInfo = await getSystemInfo(context)
        return { systemInfo }
      },
      render({ data }) {
        return <PdfPage systemInfo={data.systemInfo} />
      },
    }),
  )
}
