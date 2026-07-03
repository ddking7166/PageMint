import { readFileSync } from 'node:fs'

import { defineClientManifest } from './client.js'

import type { ClientManifest } from './client.js'

export interface ViteManifestChunk {
  file: string
  name?: string
  src?: string
  css?: string[]
  imports?: string[]
  isEntry?: boolean
}

export type ViteManifest = Record<string, ViteManifestChunk>

export interface ViteClientAssets {
  manifest: ClientManifest
  styles: string[]
  entry: ViteManifestChunk
}

export interface LoadViteClientAssetsOptions {
  manifestPath: string | URL
  moduleId: string
  entryKey?: string
  entryName?: string
  entrySrc?: string
  publicPath?: string
  missingManifestMessage?: (error: unknown) => string
  missingEntryMessage?: string
}

export function loadViteManifest(manifestPath: string | URL): ViteManifest {
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as ViteManifest
}

export function loadViteClientAssets(options: LoadViteClientAssetsOptions): ViteClientAssets {
  let viteManifest: ViteManifest

  try {
    viteManifest = loadViteManifest(options.manifestPath)
  } catch (error) {
    if (options.missingManifestMessage) {
      throw new Error(options.missingManifestMessage(error))
    }
    throw error
  }

  return resolveViteClientAssets(viteManifest, options)
}

export function createViteClientAssetsLoader(options: LoadViteClientAssetsOptions) {
  let cachedAssets: ViteClientAssets | null = null

  return function loadCachedViteClientAssets(): ViteClientAssets {
    cachedAssets ??= loadViteClientAssets(options)
    return cachedAssets
  }
}

export function resolveViteClientAssets(
  viteManifest: ViteManifest,
  options: Omit<LoadViteClientAssetsOptions, 'manifestPath' | 'missingManifestMessage'>,
): ViteClientAssets {
  const entry = findViteEntry(viteManifest, options)
  const publicPath = options.publicPath ?? '/static/'

  return {
    manifest: defineClientManifest({
      modules: {
        [options.moduleId]: {
          scripts: [
            assetHref(entry.file, publicPath),
          ],
        },
      },
    }),
    styles: collectViteCss(viteManifest, entry).map((file) => assetHref(file, publicPath)),
    entry,
  }
}

export function viteClientShimScript(assets: Pick<ViteClientAssets, 'manifest' | 'styles'>, moduleId: string): string {
  const scripts = assets.manifest.modules[moduleId]?.scripts ?? []
  const scriptSrc = typeof scripts[0] === 'string' ? scripts[0] : scripts[0]?.src

  return [
    ';(function(){',
    ...assets.styles.map((href) => (
      `var link=document.createElement('link');link.rel='stylesheet';link.href=${JSON.stringify(href)};document.head.appendChild(link);`
    )),
    scriptSrc
      ? `var script=document.createElement('script');script.type='module';script.src=${JSON.stringify(scriptSrc)};document.head.appendChild(script);`
      : '',
    '})();',
    '',
  ].join('\n')
}

export function collectViteCss(
  manifest: ViteManifest,
  chunk: ViteManifestChunk,
  seen = new Set<string>(),
): string[] {
  const files = [...(chunk.css ?? [])]

  for (const importKey of chunk.imports ?? []) {
    if (seen.has(importKey)) continue
    seen.add(importKey)
    const imported = manifest[importKey]
    if (imported) files.push(...collectViteCss(manifest, imported, seen))
  }

  return [...new Set(files)]
}

function findViteEntry(
  manifest: ViteManifest,
  options: Omit<LoadViteClientAssetsOptions, 'manifestPath' | 'missingManifestMessage'>,
): ViteManifestChunk {
  const entry = (
    (options.entryKey ? manifest[options.entryKey] : undefined) ??
    Object.values(manifest).find((chunk) => (
      chunk.isEntry &&
      Boolean(options.entryName) &&
      chunk.name === options.entryName
    )) ??
    Object.values(manifest).find((chunk) => (
      chunk.isEntry &&
      Boolean(options.entrySrc) &&
      chunk.src === options.entrySrc
    )) ??
    (options.entrySrc ? manifest[options.entrySrc] : undefined)
  )

  if (!entry?.file) {
    throw new Error(options.missingEntryMessage ?? 'Vite manifest entry not found')
  }

  return entry
}

function assetHref(file: string, publicPath: string): string {
  const prefix = publicPath.endsWith('/') ? publicPath : `${publicPath}/`
  return `${prefix}${file.replace(/^\/+/, '')}`
}
