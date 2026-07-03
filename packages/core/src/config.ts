import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

export interface LoadEnvOptions {
  cwd?: string
  appEnv?: string
  files?: string[]
}

export interface LoadedEnv {
  appEnv: string
  cwd: string
  files: string[]
}

export interface PageMintConfigLoaderContext<TConfig, TResolvedConfig> {
  rawConfig: TConfig
  config: TResolvedConfig
  loadedEnv: LoadedEnv
  envValue: (name: string) => string
}

export interface CreatePageMintConfigLoaderOptions<TConfig, TResolvedConfig> {
  rawConfig: TConfig
  env?: LoadEnvOptions
  withDefaults: (config: TConfig) => TResolvedConfig
  resolve: (context: PageMintConfigLoaderContext<TConfig, TResolvedConfig>) => TResolvedConfig
}

export function definePageMintConfig<TConfig extends object>(config: TConfig): TConfig {
  return config
}

export function createEnvLoader(defaultOptions: LoadEnvOptions = {}) {
  let loaded: LoadedEnv | null = null

  return function loadScopedEnvFiles(options: LoadEnvOptions = {}): LoadedEnv {
    if (loaded) return loaded

    const resolvedOptions = {
      ...defaultOptions,
      ...options,
    }
    const cwd = resolvedOptions.cwd ?? process.cwd()
    const appEnv = resolvedOptions.appEnv ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development'
    const files = resolvedOptions.files ?? [
      '.env',
      `.env.${appEnv}`,
      '.env.local',
      `.env.${appEnv}.local`,
    ]
    const lockedKeys = new Set(Object.keys(process.env))
    const loadedFiles: string[] = []

    for (const file of files) {
      const filePath = path.resolve(cwd, file)
      if (!existsSync(filePath)) continue

      const values = parseEnvFile(readFileSync(filePath, 'utf8'))
      for (const [key, value] of Object.entries(values)) {
        if (lockedKeys.has(key)) continue
        process.env[key] = value
      }
      loadedFiles.push(filePath)
    }

    loaded = {
      appEnv,
      cwd,
      files: loadedFiles,
    }
    return loaded
  }
}

export const loadEnvFiles = createEnvLoader()

export function envValue(name: string): string {
  return process.env[name]?.trim() || ''
}

export function createPageMintConfigLoader<TConfig, TResolvedConfig>({
  rawConfig,
  env,
  withDefaults,
  resolve,
}: CreatePageMintConfigLoaderOptions<TConfig, TResolvedConfig>) {
  const loadScopedEnvFiles = createEnvLoader(env)
  let cachedConfig: TResolvedConfig | null = null

  return function loadPageMintConfig(): TResolvedConfig {
    if (cachedConfig) return cachedConfig

    const loadedEnv = loadScopedEnvFiles()
    const config = withDefaults(rawConfig)
    cachedConfig = resolve({
      rawConfig,
      config,
      loadedEnv,
      envValue,
    })
    return cachedConfig
  }
}

function parseEnvFile(content: string): Record<string, string> {
  const values: Record<string, string> = {}

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    const rawValue = trimmed.slice(separator + 1).trim()
    if (!key) continue

    values[key] = stripQuotes(rawValue)
  }

  return values
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}
