import { fileURLToPath } from 'node:url'

import { createPageMintConfigLoader } from '@pagemint/hono/node'

import rawConfig from '../pagemint.config.js'
import { definePageMintConfig } from './define-config.js'

import type { ClientScriptInput } from '@pagemint/hono'
import type { AppEnv, CacheDriver, PageMintConfig, StyleEngine } from './define-config.js'

export interface ResolvedPageMintConfig {
  appEnv: AppEnv
  server: {
    port: number
  }
  cache: {
    driver: CacheDriver
    fileDir: string
  }
  database: {
    url: string
  }
  redis: {
    url: string
  }
  client: {
    modules: string[]
    scripts: ClientScriptInput[]
  }
  styles: {
    input: string
    output: string
    engine: StyleEngine
    href: string
  }
  thirdParty: {
    fanke: {
      publicApiBaseUrl: string
      serverApiBaseUrl: string
      publicApiKey: string
      mmsAppId: string
      publicBncImageKey: string
      publicCdnBaseUrl: string
      publicSiteUrl: string
      publicPcSiteUrl: string
      publicH5SiteUrl: string
    }
  }
}

export { definePageMintConfig }
export type { AppEnv, CacheDriver, PageMintConfig, StyleEngine }

export const loadAppConfig = createPageMintConfigLoader<PageMintConfig, ResolvedPageMintConfig>({
  rawConfig,
  env: {
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
  },
  withDefaults,
  resolve({ config, loadedEnv, envValue }) {
    const port = numberFromEnv('PORT', envValue) ?? config.server.port

    return {
      appEnv: envValue('APP_ENV') || loadedEnv.appEnv || config.appEnv,
      server: {
        port,
      },
      cache: {
        driver: config.cache.driver,
        fileDir: config.cache.fileDir,
      },
      database: {
        url: envValue('DATABASE_URL') || config.database.url,
      },
      redis: {
        url: envValue('REDIS_URL') || config.redis.url,
      },
      client: {
        modules: [...config.client.modules],
        scripts: [...(config.client.scripts ?? [])],
      },
      styles: {
        input: config.styles.input,
        output: config.styles.output,
        engine: config.styles.engine,
        href: staticStyleHref(config.styles.output),
      },
      thirdParty: {
        fanke: {
          publicApiBaseUrl: envValue('PAGEMINT_PUBLIC_FANKE_API_BASE_URL') || config.thirdParty.fanke.publicApiBaseUrl,
          serverApiBaseUrl: envValue('PAGEMINT_FANKE_SERVER_API_BASE_URL') || config.thirdParty.fanke.serverApiBaseUrl,
          publicApiKey: envValue('PAGEMINT_PUBLIC_FANKE_API_KEY') || config.thirdParty.fanke.publicApiKey,
          mmsAppId: envValue('PAGEMINT_FANKE_MMS_APPID') || config.thirdParty.fanke.mmsAppId,
          publicBncImageKey: envValue('PAGEMINT_PUBLIC_FANKE_BNC_IMAGE_KEY') || config.thirdParty.fanke.publicBncImageKey,
          publicCdnBaseUrl: envValue('PAGEMINT_PUBLIC_FANKE_CDN_BASE_URL') || config.thirdParty.fanke.publicCdnBaseUrl,
          publicSiteUrl: envValue('PAGEMINT_PUBLIC_FANKE_SITE_URL') || config.thirdParty.fanke.publicSiteUrl,
          publicPcSiteUrl: envValue('PAGEMINT_PUBLIC_FANKE_PC_SITE_URL') || config.thirdParty.fanke.publicPcSiteUrl,
          publicH5SiteUrl: envValue('PAGEMINT_PUBLIC_FANKE_H5_SITE_URL') || config.thirdParty.fanke.publicH5SiteUrl,
        },
      },
    }
  },
})

function withDefaults(config: PageMintConfig): ResolvedPageMintConfig {
  return {
    appEnv: config.appEnv ?? 'development',
    server: {
      port: config.server?.port ?? 3001,
    },
    cache: {
      driver: config.cache?.driver ?? 'memory',
      fileDir: config.cache?.fileDir ?? '.pagemint/cache',
    },
    database: {
      url: config.database?.url ?? '',
    },
    redis: {
      url: config.redis?.url ?? '',
    },
    client: {
      modules: config.client?.modules ?? ['pc:fanke'],
      scripts: config.client?.scripts ?? [],
    },
    styles: {
      input: config.styles?.input ?? 'src/styles/app.css',
      output: config.styles?.output ?? 'src/static/tailwind.css',
      engine: config.styles?.engine ?? 'tailwind',
      href: '',
    },
    thirdParty: {
      fanke: {
        publicApiBaseUrl: config.thirdParty?.fanke?.publicApiBaseUrl ?? '/ysapi',
        serverApiBaseUrl: config.thirdParty?.fanke?.serverApiBaseUrl ?? '',
        publicApiKey: config.thirdParty?.fanke?.publicApiKey ?? '',
        mmsAppId: config.thirdParty?.fanke?.mmsAppId ?? '',
        publicBncImageKey: config.thirdParty?.fanke?.publicBncImageKey ?? '',
        publicCdnBaseUrl: config.thirdParty?.fanke?.publicCdnBaseUrl ?? '',
        publicSiteUrl: config.thirdParty?.fanke?.publicSiteUrl ?? 'http://localhost:3001',
        publicPcSiteUrl: config.thirdParty?.fanke?.publicPcSiteUrl ?? 'http://localhost:3001',
        publicH5SiteUrl: config.thirdParty?.fanke?.publicH5SiteUrl ?? 'http://localhost:3002',
      },
    },
  }
}

function staticStyleHref(output: string): string {
  const normalized = output.replace(/\\/g, '/').replace(/^\.\/+/, '')
  const prefix = 'src/static/'
  if (normalized.startsWith(prefix)) {
    return `/${normalized.slice(4)}`
  }

  const fileName = normalized.split('/').filter(Boolean).pop()
  return fileName ? `/static/${fileName}` : '/static/tailwind.css'
}

function numberFromEnv(name: string, readEnv: (name: string) => string): number | undefined {
  const value = readEnv(name)
  if (!value) return undefined

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error(`${name} 必须是 1 到 65535 之间的端口号`)
  }
  return parsed
}
