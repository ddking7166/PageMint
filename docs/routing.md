# Routing

Routes are registered with `app.page(definePage(...))`.

```tsx
app.page(
  definePage({
    path: '/movies/:id',
    load({ params }) {
      return { id: params.id }
    },
    render({ data }) {
      return <html><body>{data.id}</body></html>
    },
  }),
)
```

Dynamic params use Hono-style `:param` segments.

## Wildcard Routes

Use a trailing `*` for catch-all page routes:

```tsx
app.page(
  definePage({
    path: '/category/:id/:slug/*',
    load({ params }) {
      return {
        id: params.id,
        slug: params.slug,
        segments: params['*'].split('/').filter(Boolean),
      }
    },
    render({ data }) {
      return <html><body>{data.segments.join(', ')}</body></html>
    },
  }),
)
```

Named wildcards are also supported:

```tsx
definePage({
  path: '/docs/:path*',
  load({ params }) {
    return { path: params.path }
  },
  render({ data }) {
    return <html><body>{data.path}</body></html>
  },
})
```

Wildcard segments must be the last segment in the route.

## Route Modules

For real applications, keep `server.tsx` small and register route groups from modules:

```tsx
const app = createPageMintApp({ cache })

registerStaticRoutes(app)
registerSeoRoutes(app)
registerMovieRoutes(app)
registerUserRoutes(app)
```

This keeps static assets, XML routes, proxy routes, and page routes from accumulating in one large entry file.
