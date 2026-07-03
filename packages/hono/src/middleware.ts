import type { MiddlewareHandler } from 'hono'

export function pagemintPoweredBy(value = 'PageMint'): MiddlewareHandler {
  return async (c, next) => {
    await next()
    c.res.headers.set('x-powered-by', value)
  }
}
