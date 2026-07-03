import { definePageMintConfig as defineSdkPageMintConfig } from '@pagemint/hono/node'

import type { ClientScriptInput } from '@pagemint/hono'

export type AppEnv = 'development' | 'test' | 'staging' | 'production' | string
export type CacheDriver = 'memory' | 'file' | 'redis'
export type StyleEngine = 'tailwind'

export interface PageMintConfig {
  appEnv?: AppEnv
  server?: {
    port?: number
  }
  cache?: {
    driver?: CacheDriver
    fileDir?: string
  }
  database?: {
    url?: string
  }
  redis?: {
    url?: string
  }
  client?: {
    modules?: string[]
    scripts?: ClientScriptInput[]
  }
  styles?: {
    input?: string
    output?: string
    engine?: StyleEngine
  }
  thirdParty?: {
    fanke?: {
      publicApiBaseUrl?: string
      serverApiBaseUrl?: string
      publicApiKey?: string
      mmsAppId?: string
      publicBncImageKey?: string
      publicCdnBaseUrl?: string
      publicSiteUrl?: string
      publicPcSiteUrl?: string
      publicH5SiteUrl?: string
    }
  }
}

export function definePageMintConfig(config: PageMintConfig): PageMintConfig {
  return defineSdkPageMintConfig(config)
}
