import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

import { pcClientShimScript } from '../client/manifest.js'

import type { PageMintHonoApp } from '@pagemint/hono'

const STATIC_FILE_CACHE_MAX_ENTRIES = 256
const STATIC_FILE_CACHE_MAX_BYTES = 32 * 1024 * 1024
const STATIC_FILE_CACHE_MAX_FILE_BYTES = 2 * 1024 * 1024

type StaticFileCacheEntry = {
  content: ArrayBuffer
  bytes: number
}

const staticFileCache = new Map<string, StaticFileCacheEntry>()
let staticFileCacheBytes = 0

export function registerStaticRoutes(app: PageMintHonoApp, publicRoot: string): void {
  app.get('/assets/*', (c) => servePublicFile(c.req.path, publicRoot))
  app.get('/h5/*', (c) => servePublicFile(c.req.path, publicRoot))
  app.get('/common/*', (c) => servePublicFile(c.req.path, publicRoot))
  app.get('/load/*', (c) => servePublicFile(c.req.path, publicRoot))

  app.get('/static/fanke-client.js', async (c) => {
    return c.text(pcClientShimScript(), 200, {
      'content-type': 'text/javascript; charset=UTF-8',
      'cache-control': 'no-cache',
    })
  })

  app.get('/static/build/*', async (c) => {
    const filePath = c.req.path.replace(/^\/static\/+/, '')
    return serveStaticBuildFile(filePath)
  })

  app.get('/static/*', async (c) => {
    const filePath = c.req.path.replace(/^\/static\/+/, '')
    if (!isSafeStaticCssPath(filePath)) {
      return c.text('Not Found', 404)
    }

    const content = await readCachedFile(
      new URL(`../../src/static/${filePath}`, import.meta.url),
      `static:${filePath}`,
    )
    if (content === null) {
      return c.text('Not Found', 404)
    }

    return new Response(content, {
      status: 200,
      headers: {
        'content-type': 'text/css; charset=UTF-8',
        'cache-control': 'public, max-age=300',
      },
    })
  })
}

function isSafeStaticCssPath(filePath: string): boolean {
  return /^[a-zA-Z0-9_./-]+\.css$/.test(filePath) &&
    !filePath.includes('..') &&
    !filePath.startsWith('/') &&
    !filePath.startsWith('build/') &&
    !filePath.startsWith('.vite/') &&
    filePath !== 'pc.css'
}

async function serveStaticBuildFile(filePath: string): Promise<Response> {
  if (!isSafeBuildAssetPath(filePath)) {
    return new Response('Not Found', { status: 404 })
  }

  const content = await readCachedFile(
    new URL(`../../src/static/${filePath}`, import.meta.url),
    `static:${filePath}`,
  )
  if (content === null) {
    return new Response('Not Found', { status: 404 })
  }

  return new Response(content, {
    status: 200,
    headers: {
      'content-type': contentType(filePath),
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}

function isSafeBuildAssetPath(filePath: string): boolean {
  return /^[a-zA-Z0-9_./()-]+$/.test(filePath) &&
    filePath.startsWith('build/') &&
    !filePath.includes('..') &&
    !filePath.startsWith('/') &&
    !filePath.endsWith('/')
}

async function servePublicFile(pathname: string, publicRoot: string): Promise<Response> {
  const filePath = pathname.replace(/^\/+/, '')
  if (!isSafePublicPath(filePath)) {
    return new Response('Not Found', { status: 404 })
  }

  const content = await readCachedFile(
    new URL(`./${filePath}`, publicRootUrl(publicRoot)),
    `public:${filePath}`,
  )
  if (content === null) {
    return new Response('Not Found', { status: 404 })
  }

  return new Response(content, {
    status: 200,
    headers: {
      'content-type': contentType(filePath),
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}

function isSafePublicPath(filePath: string): boolean {
  return /^[a-zA-Z0-9_./ ()-]+$/.test(filePath) &&
    !filePath.includes('..') &&
    !filePath.startsWith('/') &&
    !filePath.endsWith('/')
}

function publicRootUrl(path: string): URL {
  const normalized = path.endsWith('/') ? path : `${path}/`
  return pathToFileURL(normalized)
}

async function readCachedFile(url: URL, cacheKey: string): Promise<ArrayBuffer | null> {
  const cached = staticFileCache.get(cacheKey)
  if (cached) {
    staticFileCache.delete(cacheKey)
    staticFileCache.set(cacheKey, cached)
    return cached.content
  }

  const content = await readFile(url).catch(() => null)
  if (content === null) return null

  const cachedContent = new Uint8Array(content.byteLength)
  cachedContent.set(content)
  rememberCachedFile(cacheKey, cachedContent.buffer)
  return cachedContent.buffer
}

function rememberCachedFile(cacheKey: string, content: ArrayBuffer): void {
  const bytes = content.byteLength
  if (bytes > STATIC_FILE_CACHE_MAX_FILE_BYTES) return

  const current = staticFileCache.get(cacheKey)
  if (current) {
    staticFileCacheBytes -= current.bytes
    staticFileCache.delete(cacheKey)
  }

  staticFileCache.set(cacheKey, { content, bytes })
  staticFileCacheBytes += bytes

  while (
    staticFileCache.size > STATIC_FILE_CACHE_MAX_ENTRIES ||
    staticFileCacheBytes > STATIC_FILE_CACHE_MAX_BYTES
  ) {
    const oldestKey = staticFileCache.keys().next().value
    if (!oldestKey) break
    const oldest = staticFileCache.get(oldestKey)
    if (oldest) staticFileCacheBytes -= oldest.bytes
    staticFileCache.delete(oldestKey)
  }
}

function contentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'css':
      return 'text/css; charset=UTF-8'
    case 'js':
      return 'text/javascript; charset=UTF-8'
    case 'json':
      return 'application/json; charset=UTF-8'
    case 'svg':
      return 'image/svg+xml'
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'woff':
      return 'font/woff'
    case 'woff2':
      return 'font/woff2'
    case 'ttf':
      return 'font/ttf'
    default:
      return 'application/octet-stream'
  }
}
