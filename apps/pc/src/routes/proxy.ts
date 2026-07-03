import { proxyClientApi, proxyRawYsapi } from '../lib/proxy.js'

import type { PageMintHonoApp } from '@pagemint/hono'

export function registerProxyRoutes(app: PageMintHonoApp): void {
  app.all('/ysapi/*', async (c) => {
    try {
      return await proxyRawYsapi(c.req.raw)
    } catch (error) {
      return c.json({ status: 'n', error: error instanceof Error ? error.message : '代理失败' }, 502)
    }
  })

  app.all('/client-api/*', async (c) => {
    try {
      return await proxyClientApi(c.req.raw)
    } catch (error) {
      return c.json({ status: 'n', error: error instanceof Error ? error.message : '代理失败' }, 502)
    }
  })
}
