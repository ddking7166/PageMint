import type { PageRenderBody, PageRenderResponse } from './types.js'

export interface PageResponseInit {
  status?: number
  headers?: Record<string, string>
}

export function pageResponse(
  body: PageRenderBody,
  init: PageResponseInit = {},
): PageRenderResponse {
  return {
    __pagemintResponse: true,
    body,
    status: init.status,
    headers: init.headers,
  }
}

export function redirect(
  location: string,
  status = 302,
  headers: Record<string, string> = {},
): PageRenderResponse {
  return pageResponse('', {
    status,
    headers: {
      ...headers,
      location,
    },
  })
}

export function notFound(
  body: PageRenderBody = 'Not Found',
  headers: Record<string, string> = {},
): PageRenderResponse {
  return pageResponse(body, {
    status: 404,
    headers,
  })
}

export function isPageRenderResponse(value: unknown): value is PageRenderResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { __pagemintResponse?: unknown }).__pagemintResponse === true
  )
}
