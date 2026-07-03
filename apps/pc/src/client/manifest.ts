import {
  createViteClientAssetsLoader,
  viteClientShimScript,
} from '@pagemint/hono/node'

import type { ViteClientAssets } from '@pagemint/hono/node'

export const pcDefaultClientModules = ['pc:fanke']
export type PcClientAssets = ViteClientAssets

const pcClientModuleId = 'pc:fanke'

export const loadPcClientAssets = createViteClientAssetsLoader({
  manifestPath: new URL('../../src/static/.vite/manifest.json', import.meta.url),
  moduleId: pcClientModuleId,
  entryName: 'fanke-client',
  entrySrc: 'virtual:pagemint-fanke-client',
  publicPath: '/static/',
  missingEntryMessage: 'PC 端 Vite manifest 中缺少 fanke-client 入口',
  missingManifestMessage(error) {
    const message = error instanceof Error ? error.message : String(error)
    return `未找到 PC 端 Vite 资产 manifest，请先运行 pnpm --filter @pagemint/app-pc run assets:build。原始错误: ${message}`
  },
})

export const pcClientManifest = loadPcClientAssets().manifest

export function pcClientStyles(): string[] {
  return loadPcClientAssets().styles
}

export function pcClientShimScript(): string {
  return viteClientShimScript(loadPcClientAssets(), pcClientModuleId)
}
