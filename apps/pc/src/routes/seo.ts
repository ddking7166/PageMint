import {
  getSystemInfo,
  serverApiBaseUrl,
} from '../lib/fanke-api.js'
import { createPcContext } from './helpers.js'

import type { PageMintHonoApp } from '@pagemint/hono'
import type { AnyRecord } from '../lib/records.js'

export function registerSeoRoutes(app: PageMintHonoApp): void {
  app.get('/robots.txt', async (c) => {
    try {
      const asset = await fetchSeoText('/seo/v1/robots.txt', 'text/plain; charset=utf-8')
      const base = siteOrigin(c.req.raw)
      const body = asset.body.replace(/^Sitemap:\s*https?:\/\/[^\s]+/gim, `Sitemap: ${base}/sitemap.xml`)
      return new Response(body, {
        status: asset.status,
        headers: {
          'content-type': asset.contentType,
          'cache-control': asset.cacheControl || 'private, no-cache, no-store, max-age=0, must-revalidate',
          vary: 'Host, X-Forwarded-Host',
        },
      })
    } catch {
      const base = siteOrigin(c.req.raw)
      return c.text(`User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`, 200, {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'private, no-cache, no-store, max-age=0, must-revalidate',
      })
    }
  })

  app.get('/rss.xml', async (c) => {
    const context = createPcContext(c.req.raw)
    const systemInfo = await getSystemInfo(context)
    const siteUrl = String(systemInfo.site_url || systemInfo.main_url || siteOrigin(c.req.raw, systemInfo)).replace(/\/+$/, '')
    const title = String(systemInfo.site_title || systemInfo.site_name || '凡客影视')
    const description = String(systemInfo.description || systemInfo.site_title || title)
    const now = new Date().toUTCString()
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xmlEscape(title)}</title>
    <link>${xmlEscape(siteUrl)}</link>
    <description>${xmlEscape(description)}</description>
    <lastBuildDate>${now}</lastBuildDate>
    <item>
      <title>${xmlEscape(title)}</title>
      <link>${xmlEscape(siteUrl)}</link>
      <description>${xmlEscape(description)}</description>
      <pubDate>${now}</pubDate>
    </item>
  </channel>
</rss>`

    return new Response(xml, {
      status: 200,
      headers: {
        'content-type': 'application/rss+xml; charset=utf-8',
        'cache-control': 'public, max-age=3600',
      },
    })
  })

  app.get('/sitemap.xml', async (c) => {
    try {
      const asset = await fetchSeoText('/seo/v1/sitemap.xml', 'application/xml; charset=utf-8')
      const base = siteOrigin(c.req.raw)
      const body = asset.body.replace(/https?:\/\/[^/"'<>\s]+/g, base)
      return new Response(body, {
        status: asset.status,
        headers: {
          'content-type': asset.contentType,
          'cache-control': asset.cacheControl || 'public, max-age=300',
          vary: 'Host, X-Forwarded-Host',
        },
      })
    } catch {
      const base = siteOrigin(c.req.raw)
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${xmlEscape(base)}/</loc></url></urlset>`, {
        status: 200,
        headers: {
          'content-type': 'application/xml; charset=utf-8',
          'cache-control': 'public, max-age=300',
        },
      })
    }
  })

  app.get('/sitemap/:name', async (c) => {
    const name = c.req.param('name')
    try {
      const asset = await fetchSeoText(`/seo/v1/sitemap/${encodeURIComponent(name)}`, 'application/xml; charset=utf-8')
      const base = siteOrigin(c.req.raw)
      const body = asset.body.replace(/https?:\/\/[^/"'<>\s]+/g, base)
      return new Response(body, {
        status: asset.status,
        headers: {
          'content-type': asset.contentType,
          'cache-control': asset.cacheControl || 'public, max-age=300',
          vary: 'Host, X-Forwarded-Host',
        },
      })
    } catch {
      return new Response('', { status: 404, headers: { 'content-type': 'application/xml; charset=utf-8' } })
    }
  })
}

function siteOrigin(request: Request, systemInfo?: AnyRecord): string {
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = forwarded || request.headers.get('host') || ''
  const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || new URL(request.url).protocol.replace(':', '')
  if (host) return `${protocol}://${host}`.replace(/\/+$/, '')
  return String(systemInfo?.site_url || systemInfo?.main_url || '').replace(/\/+$/, '')
}

function seoAssetUrl(path: string): string {
  return `${serverApiBaseUrl().replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`
}

async function fetchSeoText(path: string, accept: string): Promise<{ body: string; status: number; contentType: string; cacheControl: string }> {
  const response = await fetch(seoAssetUrl(path), { headers: { accept } })
  return {
    body: await response.text(),
    status: response.status,
    contentType: response.headers.get('content-type') || accept,
    cacheControl: response.headers.get('cache-control') || '',
  }
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
