import { memoryCache } from '@pagemint/cache-memory'
import { createPageMintApp } from '@pagemint/hono'

import { registerPcRoutes } from './routes/index.js'

export function createPcApp() {
  const app = createPageMintApp({
    cache: memoryCache(),
    onError(error, context) {
      console.error('[pc]', context, error)
    },
  })

  registerPcRoutes(app)
  return app
}
