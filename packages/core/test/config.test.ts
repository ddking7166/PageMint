import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  createEnvLoader,
  createPageMintConfigLoader,
  definePageMintConfig,
} from '../src/config.js'

const envKeys = ['PAGEMINT_TEST_A', 'PAGEMINT_TEST_B', 'PAGEMINT_TEST_C', 'PAGEMINT_TEST_LOCKED']
const previousEnv = new Map(envKeys.map((key) => [key, process.env[key]]))

afterEach(() => {
  for (const key of envKeys) {
    const previous = previousEnv.get(key)
    if (previous === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = previous
    }
  }
})

describe('PageMint config SDK', () => {
  it('returns the typed config object unchanged', () => {
    const config = definePageMintConfig({
      server: {
        port: 3000,
      },
    })

    expect(config.server.port).toBe(3000)
  })

  it('loads environment files in app-env order without overwriting real env vars', () => {
    const cwd = mkdtempSync(path.join(tmpdir(), 'pagemint-env-'))
    process.env.PAGEMINT_TEST_LOCKED = 'real'

    try {
      writeFileSync(path.join(cwd, '.env'), [
        'PAGEMINT_TEST_A=base',
        'PAGEMINT_TEST_LOCKED=file',
      ].join('\n'))
      writeFileSync(path.join(cwd, '.env.production'), 'PAGEMINT_TEST_A=production\n')
      writeFileSync(path.join(cwd, '.env.local'), 'PAGEMINT_TEST_B=\"local\"\n')
      writeFileSync(path.join(cwd, '.env.production.local'), 'PAGEMINT_TEST_C=\'local-production\'\n')

      const loadEnvFiles = createEnvLoader({ cwd, appEnv: 'production' })
      const loaded = loadEnvFiles()

      expect(loaded.appEnv).toBe('production')
      expect(loaded.files.map((file) => path.basename(file))).toEqual([
        '.env',
        '.env.production',
        '.env.local',
        '.env.production.local',
      ])
      expect(process.env.PAGEMINT_TEST_A).toBe('production')
      expect(process.env.PAGEMINT_TEST_B).toBe('local')
      expect(process.env.PAGEMINT_TEST_C).toBe('local-production')
      expect(process.env.PAGEMINT_TEST_LOCKED).toBe('real')
    } finally {
      rmSync(cwd, { recursive: true, force: true })
    }
  })

  it('creates cached app config loaders from defaults and environment overrides', () => {
    process.env.PAGEMINT_TEST_A = 'from-env'
    let resolveCount = 0
    const loadConfig = createPageMintConfigLoader({
      rawConfig: {
        value: 'from-config',
      },
      withDefaults(config) {
        return {
          value: config.value,
          extra: 'default',
        }
      },
      resolve({ config, envValue }) {
        resolveCount += 1
        return {
          ...config,
          value: envValue('PAGEMINT_TEST_A') || config.value,
        }
      },
    })

    expect(loadConfig()).toEqual({
      value: 'from-env',
      extra: 'default',
    })
    expect(loadConfig()).toBe(loadConfig())
    expect(resolveCount).toBe(1)
  })
})
