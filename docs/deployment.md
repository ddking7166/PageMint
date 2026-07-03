# Deployment

The PC app supports both Node.js and Bun runtimes.

## Node.js

Node.js uses Hono's Node server adapter.

```tsx
import { serve } from '@hono/node-server'
import app from './app.js'

serve({ fetch: app.fetch, port: 3000 })
```

Run the PC app with Node:

```bash
pnpm --filter @pagemint/app-pc build
pnpm --filter @pagemint/app-pc start
```

The build step runs Vite before TypeScript compilation. Deploy the generated `apps/pc/src/static/.vite/manifest.json`, `apps/pc/src/static/tailwind.css`, and `apps/pc/src/static/build/assets/*` with the server bundle.

## Bun

Bun uses the same Hono app factory and starts with `Bun.serve()`.

```ts
import { createPcApp } from './app.js'

const app = createPcApp()

Bun.serve({
  port: 3000,
  fetch(request) {
    return app.fetch(request)
  },
})
```

Run the PC app with Bun:

```bash
pnpm --filter @pagemint/app-pc build
pnpm --filter @pagemint/app-pc start:bun
```

Development:

```bash
pnpm --filter @pagemint/app-pc dev:bun
```

Node remains the conservative default. Bun is available as an optional runtime for environments where Bun is installed or where dev dependencies are included.

See [benchmarks](./benchmarks.md) for the local Node/Bun comparison.
