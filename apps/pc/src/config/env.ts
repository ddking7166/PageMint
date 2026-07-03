import { fileURLToPath } from 'node:url'

import { createEnvLoader, envValue } from '@pagemint/hono/node'

import type { LoadedEnv, LoadEnvOptions } from '@pagemint/hono/node'

const loadPageMintEnvFiles = createEnvLoader({
  cwd: fileURLToPath(new URL('../..', import.meta.url)),
})

export function loadEnvFiles(options: LoadEnvOptions = {}): LoadedEnv {
  return loadPageMintEnvFiles(options)
}

export { envValue }
export type { LoadedEnv, LoadEnvOptions }
