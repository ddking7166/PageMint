import { renderToString } from 'hono/jsx/dom/server'

import { isPageRenderResponse } from './response.js'

import type { PageRenderBody, PageRenderResult } from './types.js'

export interface RenderedPageResult {
  html: string
  status: number
  headers: Record<string, string>
}

export async function renderPageResult(result: PageRenderResult): Promise<RenderedPageResult> {
  if (isPageRenderResponse(result)) {
    return {
      html: await renderToHtml(result.body),
      status: result.status ?? 200,
      headers: result.headers ?? {},
    }
  }

  return {
    html: await renderToHtml(result),
    status: 200,
    headers: {},
  }
}

export async function renderToHtml(result: PageRenderBody): Promise<string> {
  const html = typeof result === 'string' ? result : renderToString(await result)
  return addDoctype(html)
}

function addDoctype(html: string): string {
  const trimmed = html.trimStart()
  if (/^<!doctype html>/i.test(trimmed)) {
    return html
  }

  if (/^<html[\s>]/i.test(trimmed)) {
    return `<!DOCTYPE html>${html}`
  }

  return html
}
