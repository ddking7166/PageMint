# Configuration

The PC app uses a small typed configuration layer:

- `apps/pc/src/pagemint.config.ts` stores committed defaults.
- `@pagemint/hono/node` exports the reusable Node config and Vite asset SDK.
- `apps/pc/src/config/env.ts` scopes the SDK env loader to the PC app directory.
- `apps/pc/src/config/app-config.ts` resolves the final app config with `createPageMintConfigLoader()`.

## Config File

Use `definePageMintConfig()` in `apps/pc/src/pagemint.config.ts`:

```ts
import { definePageMintConfig } from './config/define-config.js'

export default definePageMintConfig({
  server: {
    port: 3001,
  },
  cache: {
    driver: 'memory',
    fileDir: '.pagemint/cache',
  },
  database: {
    url: '',
  },
  redis: {
    url: '',
  },
  client: {
    modules: ['pc:fanke'],
    scripts: [],
  },
  styles: {
    input: 'src/styles/app.css',
    output: 'src/static/tailwind.css',
    engine: 'tailwind',
  },
  thirdParty: {
    fanke: {
      publicApiBaseUrl: '/ysapi',
      serverApiBaseUrl: '',
      publicApiKey: '',
      mmsAppId: '',
      publicBncImageKey: '',
      publicCdnBaseUrl: '',
      publicSiteUrl: 'http://localhost:3001',
      publicPcSiteUrl: 'http://localhost:3001',
      publicH5SiteUrl: 'http://localhost:3002',
    },
  },
})
```

Do not put secrets in this file. Commit defaults and non-sensitive structure only.

## Runtime Loading

Use `loadAppConfig()` from `apps/pc/src/config/app-config.ts`:

```ts
const appConfig = loadAppConfig()
const port = appConfig.server.port
```

`loadAppConfig()` returns a fully resolved config object. It applies defaults first, then environment variables. The loader is built with the SDK `createPageMintConfigLoader()` API; Fanke-specific fields remain app-level business config.

## Environment Files

`loadEnvFiles()` loads files from `apps/pc` in this order:

```txt
.env
.env.${APP_ENV}
.env.local
.env.${APP_ENV}.local
```

`APP_ENV` comes from the real process environment first, then falls back to `NODE_ENV`, then `development`.

Real process environment variables have the highest priority. Values already present in `process.env` are not overwritten by files.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `APP_ENV` | No | Environment name. Common values: `development`, `test`, `staging`, `production`. |
| `PORT` | No | HTTP server port. Must be an integer from `1` to `65535`. Defaults to `3001`. |
| `PAGEMINT_PUBLIC_FANKE_API_BASE_URL` | No | Browser-visible Fanke API base path. Defaults to `/ysapi`. |
| `PAGEMINT_FANKE_SERVER_API_BASE_URL` | Yes for server API calls | Server-only absolute Fanke backend URL. Must not be a relative path. |
| `PAGEMINT_PUBLIC_FANKE_API_KEY` | Yes for encrypted API calls | Browser-visible 16-byte AES key used by the current Fanke integration. |
| `PAGEMINT_FANKE_MMS_APPID` | No | Server-only Fanke account QR salt/app id kept for parity with the legacy config. |
| `PAGEMINT_PUBLIC_FANKE_BNC_IMAGE_KEY` | No | Browser-visible image key used by the current Fanke client runtime. |
| `PAGEMINT_PUBLIC_FANKE_CDN_BASE_URL` | No | Browser-visible CDN base URL for media paths. |
| `PAGEMINT_PUBLIC_FANKE_SITE_URL` | No | Browser-visible site URL. |
| `PAGEMINT_PUBLIC_FANKE_PC_SITE_URL` | No | Browser-visible PC site URL. |
| `PAGEMINT_PUBLIC_FANKE_H5_SITE_URL` | No | Browser-visible H5 site URL. |
| `DATABASE_URL` | No | Reserved database connection URL. No database dependency is installed yet. |
| `REDIS_URL` | No | Reserved Redis connection URL. No Redis client dependency is installed yet. |

`PAGEMINT_PUBLIC_*` means the value may be rendered into HTML or used by browser scripts. Do not store server-only secrets in public variables.

## Example

```env
APP_ENV=development
PORT=3001

PAGEMINT_PUBLIC_FANKE_API_BASE_URL=/ysapi
PAGEMINT_FANKE_SERVER_API_BASE_URL=https://your-backend.example.com/ysapi
PAGEMINT_PUBLIC_FANKE_API_KEY=replace_16b_key!
PAGEMINT_FANKE_MMS_APPID=cmsp
PAGEMINT_PUBLIC_FANKE_BNC_IMAGE_KEY=replace_with_bnc_image_key
PAGEMINT_PUBLIC_FANKE_CDN_BASE_URL=https://your-cdn.example.com
PAGEMINT_PUBLIC_FANKE_SITE_URL=http://localhost:3001
PAGEMINT_PUBLIC_FANKE_PC_SITE_URL=http://localhost:3001
PAGEMINT_PUBLIC_FANKE_H5_SITE_URL=http://localhost:3002

DATABASE_URL=
REDIS_URL=
```

## Current Scope

This configuration layer centralizes:

- server port
- browser client modules and extra client scripts
- Tailwind CSS input and Vite-generated static CSS output
- Fanke API, CDN, and browser-visible keys
- reserved database URL
- reserved Redis URL

It does not add database or Redis dependencies. `DATABASE_URL` and `REDIS_URL` are only parsed into `appConfig` for future integration.

## Client Assets

The PC app uses PageMint client modules, but the browser files themselves are built by Vite.

Default config:

```ts
client: {
  modules: ['pc:fanke'],
  scripts: [],
}
```

`client.modules` selects modules from `apps/pc/src/client/manifest.ts`. That manifest uses `createViteClientAssetsLoader()` from `@pagemint/hono/node` to read Vite's generated manifest at `apps/pc/src/static/.vite/manifest.json` and inject hashed assets from `apps/pc/src/static/build/assets/`.

Current modules:

| Module | Description |
| --- | --- |
| `pc:fanke` | Loads the Vite-bundled Fanke PC interaction entry. `crypto-js` is in the default entry; `hls.js` is emitted as a dynamic Vite chunk and loaded only when HLS playback is needed. |

The Fanke interaction module is split under `apps/pc/src/client/fanke/`:

| File | Responsibility |
| --- | --- |
| `main.js` | Entry point and initialization orchestration. |
| `api.js` | Browser API calls and encrypted Fanke payloads. |
| `utils.js` | DOM, cookie, URL, formatting, and media helpers. |
| `image.js` | `.bnc` image decryption and image fallbacks. |
| `ui.js` | Banner, horizontal row, copy, toast, and back-to-top behavior. |
| `search.js` | Search popup, local keyword history, and smart search. |
| `header.js` | Header user info, viewing history dropdown, and account switch dialog. |
| `movie.js` | Movie detail page, player, episode switching, comments, favorite, and like actions. |
| `live.js` | Live page line switching and HLS playback. |

To append a project-specific external or already-built script:

```ts
export default definePageMintConfig({
  client: {
    modules: ['pc:fanke'],
    scripts: [
      'https://analytics.example.com/client.js',
      { src: '/assets/js/custom-widget.js', type: 'classic', defer: true },
    ],
  },
})
```

String scripts are treated as ES modules. Use `{ type: 'classic', defer: true }` for a non-module script:

```ts
scripts: [
  { src: 'https://cdn.example.com/legacy-widget.js', type: 'classic', defer: true },
]
```

Do not point `client.scripts` at `apps/pc/src/client/*` source files. Local interaction code should be added to the Vite entry or exposed through a custom Vite build and then referenced from a client manifest.

To replace the built-in interaction completely, point `client.modules` to your own module ids and add those modules to a manifest that reads your Vite output.

## Styles

The PC app builds CSS through Vite. `styles.input` is imported into the Vite client entry together with `apps/pc/src/static/pc.css`, so the generated CSS contains Tailwind utilities plus the existing PC stylesheet.

```ts
definePageMintConfig({
  styles: {
    input: 'src/styles/app.css',
    output: 'src/static/tailwind.css',
    engine: 'tailwind',
  },
})
```

Fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `string` | No | Tailwind entry CSS, relative to `apps/pc`. Defaults to `src/styles/app.css`. |
| `output` | `string` | No | Vite-generated CSS file, relative to `apps/pc`. Defaults to `src/static/tailwind.css`. |
| `engine` | `'tailwind'` | No | Style compiler. Defaults to `tailwind`. |

The default input file is `apps/pc/src/styles/app.css`.

It imports Tailwind theme and utilities only:

```css
@layer theme, utilities;

@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);

@source "../";
```

This intentionally skips Tailwind preflight for now, so existing `pc.css` base styles keep their current behavior.

Vite output:

| Output | Description |
| --- | --- |
| `src/static/tailwind.css` | Minified CSS from `styles.input` and `src/static/pc.css`. The exact path follows `styles.output`. |
| `src/static/build/assets/*.js` | Minified client JavaScript entry, dynamic chunks, and imported runtime assets. |
| `src/static/.vite/manifest.json` | Vite manifest used by `pcClientManifest` and `pcClientStyles()`. |

`publicDir` copying is disabled for this Vite build. Existing public assets continue to be served by the app routes at `/assets/*`, `/h5/*`, `/common/*`, and `/load/*`.

Commands:

| Command | Description |
| --- | --- |
| `pnpm --filter @pagemint/app-pc run assets:build` | Runs Vite and builds minified JS, CSS, manifest, and imported assets. |
| `pnpm --filter @pagemint/app-pc run assets:watch` | Watches Vite inputs and rebuilds assets. |
| `pnpm --filter @pagemint/app-pc run styles:build` | Compatibility alias for `assets:build`. |
| `pnpm --filter @pagemint/app-pc run styles:watch` | Compatibility alias for `assets:watch`. |
| `pnpm --filter @pagemint/app-pc build` | Runs `assets:build` before TypeScript compilation. |

`loadAppConfig()` still derives `styles.href` from `styles.output` for tooling and compatibility. The PC layout itself reads Vite manifest styles through `pcClientStyles()`. With the default output, the rendered stylesheet link is:

```html
<link rel="stylesheet" href="/static/tailwind.css">
```
