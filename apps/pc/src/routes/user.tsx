import { definePage } from '@pagemint/hono'

import {
  getSystemInfo,
  getUserInfo,
  getUserMovieList,
} from '../lib/fanke-api.js'
import { UserPage } from '../pages/UserPage.js'
import { createPcContext } from './helpers.js'

import type { PageMintHonoApp } from '@pagemint/hono'
import type { AnyRecord } from '../lib/records.js'

export function registerUserRoutes(app: PageMintHonoApp): void {
  app.page(
    definePage<{ systemInfo: AnyRecord; user: AnyRecord; origin: string }>({
      path: '/user',
      async load({ request }) {
        const context = createPcContext(request)
        const [systemInfo, user] = await Promise.all([
          getSystemInfo(context),
          getUserInfo(context),
        ])
        const origin = new URL(request.url).origin
        return { systemInfo, user, origin }
      },
      render({ data }) {
        return <UserPage section="index" systemInfo={data.systemInfo} user={data.user} requestOrigin={data.origin} />
      },
    }),
  )

  app.page(
    definePage<{ systemInfo: AnyRecord; user: AnyRecord; data: AnyRecord; section: 'favorite' | 'history'; origin: string }>({
      path: '/user/:section',
      async load({ request, params, query }) {
        const section = params.section === 'favorite' ? 'favorite' : 'history'
        const context = createPcContext(request)
        const [systemInfo, user, data] = await Promise.all([
          getSystemInfo(context),
          getUserInfo(context),
          getUserMovieList(section, Object.fromEntries(query), context),
        ])
        const origin = new URL(request.url).origin
        return { systemInfo, user, data, section, origin }
      },
      render({ data }) {
        return (
          <UserPage
            section={data.section}
            systemInfo={data.systemInfo}
            user={data.user}
            data={data.data}
            requestOrigin={data.origin}
          />
        )
      },
    }),
  )
}
