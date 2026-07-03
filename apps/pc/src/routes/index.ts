import { fileURLToPath } from 'node:url'

import { registerCatalogRoutes } from './catalog.js'
import { registerHomeRoutes } from './home.js'
import { registerMovieRoutes } from './movie.js'
import { registerPostRoutes } from './post.js'
import { registerProxyRoutes } from './proxy.js'
import { registerSeoRoutes } from './seo.js'
import { registerStaticRoutes } from './static.js'
import { registerUserRoutes } from './user.js'

import type { PageMintHonoApp } from '@pagemint/hono'

export function registerPcRoutes(app: PageMintHonoApp): void {
  const publicRoot = fileURLToPath(new URL('../../public', import.meta.url))

  registerStaticRoutes(app, publicRoot)
  registerProxyRoutes(app)
  registerSeoRoutes(app)
  registerHomeRoutes(app)
  registerMovieRoutes(app)
  registerCatalogRoutes(app)
  registerPostRoutes(app)
  registerUserRoutes(app)
}
