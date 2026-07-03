import { pathToFileURL } from 'node:url'

import { defineFilePage, discoverFileRoutes } from '@pagemint/core'

import type {
  DefinePageOptions,
  FileLayoutModule,
  FilePageModule,
  FileRoute,
} from '@pagemint/core'
import type { PageMintHonoApp } from './createHonoApp.js'

export interface RegisterFileRoutesOptions {
  pagesDir: string | URL
}

export async function registerFileRoutes(
  app: PageMintHonoApp,
  options: RegisterFileRoutesOptions,
): Promise<FileRoute[]> {
  const routes = await discoverFileRoutes(options)

  for (const route of routes) {
    const [pageModule, ...layoutModules] = await Promise.all([
      import(pathToFileURL(route.file).href) as Promise<FilePageModule>,
      ...route.layouts.map((layout) => (
        import(pathToFileURL(layout).href) as Promise<FileLayoutModule>
      )),
    ])
    const page = defineFilePage(route.path, pageModule, layoutModules) as DefinePageOptions<unknown>
    app.page(page)
  }

  return routes
}
