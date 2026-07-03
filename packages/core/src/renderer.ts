import { renderToString } from 'hono/jsx/dom/server'

import { injectIslandRuntime } from './islands.js'
import { isPageRenderResponse } from './response.js'

import type { PageRenderBody, PageRenderResult } from './types.js'
import type { IslandRuntimeOptions } from './islands.js'

export interface RenderedPageResult {
  html: string
  status: number
  headers: Record<string, string>
}

export interface HtmlPostProcessOptions {
  islands?: IslandRuntimeOptions | false
}

export async function renderPageResult(
  result: PageRenderResult,
  options: HtmlPostProcessOptions = {},
): Promise<RenderedPageResult> {
  if (isPageRenderResponse(result)) {
    return {
      html: await renderToHtml(result.body, options),
      status: result.status ?? 200,
      headers: result.headers ?? {},
    }
  }

  return {
    html: await renderToHtml(result, options),
    status: 200,
    headers: {},
  }
}

export async function renderToHtml(
  result: PageRenderBody,
  options: HtmlPostProcessOptions = {},
): Promise<string> {
  const html = typeof result === 'string' ? result : renderToString(await result)
  return postProcessHtml(addDoctype(html), options)
}

export function postProcessHtml(
  html: string,
  options: HtmlPostProcessOptions = {},
): string {
  if (options.islands === false) {
    return html
  }

  return injectIslandRuntime(html, options.islands)
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
