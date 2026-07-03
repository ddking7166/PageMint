import { createFankeContextFromRequest, fankePostEnvelope, normalizeEndpoint, serverApiBaseUrl } from './fanke-api.js'

export async function proxyRawYsapi(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const endpoint = normalizeEndpoint(url.pathname.replace(/^\/ysapi\/?/, ''))
  const target = `${serverApiBaseUrl()}/${endpoint}${url.search}`
  const headers = new Headers(request.headers)

  headers.delete('host')
  headers.delete('content-length')

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: filterResponseHeaders(response.headers),
  })
}

export async function proxyClientApi(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const endpoint = normalizeEndpoint(url.pathname.replace(/^\/client-api\/?/, ''))
  const context = createFankeContextFromRequest(request, 'pc')
  const data = request.method === 'GET' ? Object.fromEntries(url.searchParams) : await readJson(request)
  const envelope = await fankePostEnvelope(endpoint, data, context)
  const result = envelope.data === undefined || envelope.data === null || envelope.data === '' ? true : envelope.data
  const response = Response.json({
    status: 'y',
    data: result,
  })

  if (endpoint === 'user/findByAccount') {
    const token = authTokenFromLogin(envelope) || authTokenFromLogin(result)
    if (token) {
      response.headers.append('set-cookie', cookieHeader('_token', token, 980))
    }
  }

  return response
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json()
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function filterResponseHeaders(headers: Headers): Headers {
  const next = new Headers(headers)
  next.delete('content-encoding')
  next.delete('content-length')
  next.delete('transfer-encoding')
  return next
}

function authTokenFromLogin(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const stack: unknown[] = [value]
  const seen = new Set<unknown>()
  const tokenKeys = new Set(['token', '_token', 'access_token', 'auth_token', 'user_token'])

  while (stack.length) {
    const current = stack.shift()
    if (!current || typeof current !== 'object' || seen.has(current)) continue
    seen.add(current)

    for (const [key, nested] of Object.entries(current as Record<string, unknown>)) {
      if (tokenKeys.has(key) && typeof nested === 'string' && nested.trim()) {
        return nested.trim()
      }
      if (nested && typeof nested === 'object') stack.push(nested)
    }
  }

  return ''
}

function cookieHeader(name: string, value: string, days: number): string {
  const maxAge = Math.max(0, Math.floor(days * 24 * 60 * 60))
  return [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'SameSite=Lax',
  ].join('; ')
}
