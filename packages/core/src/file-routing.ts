import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { isPageRenderResponse, pageResponse } from './response.js'
import { definePage } from './route.js'

import type { DefinePageOptions, PageRenderResult } from './types.js'

export interface DiscoverFileRoutesOptions {
  pagesDir: string | URL
}

export interface FileRoute {
  file: string
  path: string
  layouts: string[]
}

export type FilePageOptions<TRawData = unknown, TModel = TRawData> =
  Omit<DefinePageOptions<TRawData, TModel>, 'path'> &
  Partial<Pick<DefinePageOptions<TRawData, TModel>, 'path'>>

export type FilePageModule<TRawData = unknown, TModel = TRawData> = {
  default?: FilePageOptions<TRawData, TModel>
  page?: FilePageOptions<TRawData, TModel>
} & Partial<FilePageOptions<TRawData, TModel>>

export interface FileLayoutProps<TModel = unknown> {
  children: PageRenderResult
  data: TModel
  model: TModel
}

export type FileLayout<TModel = unknown> =
  (props: FileLayoutProps<TModel> & Record<string, unknown>) => PageRenderResult | Promise<PageRenderResult>

export interface FileLayoutModule<TModel = unknown> {
  default?: FileLayout<TModel>
  Layout?: FileLayout<TModel>
}

const PAGE_FILE_RE = /\.page\.(tsx?|jsx?)$/
const LAYOUT_FILES = ['layout.tsx', 'layout.ts', 'layout.jsx', 'layout.js']

export async function discoverFileRoutes(
  options: DiscoverFileRoutesOptions,
): Promise<FileRoute[]> {
  const pagesDir = normalizeFsPath(options.pagesDir)
  const files = await walkPages(pagesDir)
  const routes: FileRoute[] = []

  for (const file of files) {
    if (!PAGE_FILE_RE.test(file)) {
      continue
    }

    routes.push({
      file,
      path: filePathToRoutePath(file, pagesDir),
      layouts: await discoverLayouts(file, pagesDir),
    })
  }

  return routes.sort((left, right) => left.path.localeCompare(right.path))
}

export function filePathToRoutePath(file: string, pagesDir: string | URL): string {
  const root = normalizeFsPath(pagesDir)
  const relative = path.relative(root, file).replace(/\\/g, '/')
  const withoutExt = relative.replace(PAGE_FILE_RE, '')
  const segments = withoutExt.split('/').filter(Boolean)
  const routeSegments = segments.flatMap((segment, index) => {
    if (segment === 'index' && index === segments.length - 1) {
      return []
    }

    return [fileSegmentToRouteSegment(segment)]
  })

  return routeSegments.length > 0 ? `/${routeSegments.join('/')}` : '/'
}

export function defineFilePage<TRawData, TModel = TRawData>(
  routePath: string,
  module: FilePageModule<TRawData, TModel>,
  layouts: Array<FileLayoutModule<TModel>> = [],
): DefinePageOptions<TRawData, TModel> {
  const source = module.default ?? module.page ?? module

  if (!source.load || !source.render) {
    throw new Error(`File route "${routePath}" must export load() and render()`)
  }
  const load = source.load
  const render = source.render

  const layoutFns = layouts
    .map(resolveLayout)
    .filter((layout): layout is FileLayout<TModel> => Boolean(layout))

  const page = definePage({
    ...source,
    load,
    path: source.path ?? routePath,
    async render(ctx) {
      let result = await render(ctx)

      for (const layout of [...layoutFns].reverse()) {
        const body = isPageRenderResponse(result) ? result.body : result
        const wrapped = await layout({ ...ctx, children: body })
        if (isPageRenderResponse(result)) {
          result = isPageRenderResponse(wrapped)
            ? pageResponse(wrapped.body, {
              status: wrapped.status ?? result.status,
              headers: {
                ...result.headers,
                ...wrapped.headers,
              },
            })
            : pageResponse(wrapped, {
            status: result.status,
            headers: result.headers,
          })
          continue
        }

        result = wrapped
      }

      return result
    },
  })

  return page
}

async function walkPages(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walkPages(fullPath))
      continue
    }

    if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files
}

async function discoverLayouts(file: string, pagesDir: string): Promise<string[]> {
  const layouts: string[] = []
  const fileDir = path.dirname(file)
  let current = pagesDir

  while (isInsideOrEqual(current, fileDir)) {
    const entries = await safeReadDir(current)
    for (const layoutFile of LAYOUT_FILES) {
      if (entries.has(layoutFile)) {
        layouts.push(path.join(current, layoutFile))
        break
      }
    }

    if (current === fileDir) {
      break
    }

    const relative = path.relative(current, fileDir)
    const [next] = relative.split(path.sep)
    if (!next) {
      break
    }
    current = path.join(current, next)
  }

  return layouts
}

async function safeReadDir(dir: string): Promise<Set<string>> {
  try {
    return new Set(await readdir(dir))
  } catch {
    return new Set()
  }
}

function fileSegmentToRouteSegment(segment: string): string {
  if (/^\[\.\.\.[^\]]+\]$/.test(segment)) {
    return `:${segment.slice(4, -1)}*`
  }

  if (/^\[[^\]]+\]$/.test(segment)) {
    return `:${segment.slice(1, -1)}`
  }

  return segment
}

function resolveLayout<TModel>(module: FileLayoutModule<TModel>): FileLayout<TModel> | undefined {
  return module.default ?? module.Layout
}

function normalizeFsPath(input: string | URL): string {
  return input instanceof URL ? fileURLToPath(input) : path.resolve(input)
}

function isInsideOrEqual(parent: string, child: string): boolean {
  const relative = path.relative(parent, child)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}
