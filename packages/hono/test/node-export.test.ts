import { describe, expect, it } from 'vitest'

import {
  createEnvLoader,
  createPageMintConfigLoader,
  createViteClientAssetsLoader,
  definePageMintConfig,
} from '../src/node.js'

describe('@pagemint/hono/node exports', () => {
  it('re-exports Node-only SDK helpers', () => {
    expect(typeof createEnvLoader).toBe('function')
    expect(typeof createPageMintConfigLoader).toBe('function')
    expect(typeof createViteClientAssetsLoader).toBe('function')
    expect(typeof definePageMintConfig).toBe('function')
  })
})
