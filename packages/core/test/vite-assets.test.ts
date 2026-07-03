import { describe, expect, it } from 'vitest'

import {
  collectViteCss,
  resolveViteClientAssets,
  viteClientShimScript,
} from '../src/node.js'
import { resolveClientScripts } from '../src/index.js'

import type { ViteManifest } from '../src/node.js'

describe('Vite client asset SDK', () => {
  const manifest: ViteManifest = {
    'virtual:pagemint-app': {
      file: 'build/assets/app-123.js',
      name: 'app',
      src: 'virtual:pagemint-app',
      isEntry: true,
      css: ['build/assets/app-123.css'],
      imports: ['_vendor.js'],
    },
    '_vendor.js': {
      file: 'build/assets/vendor-456.js',
      css: ['build/assets/vendor-456.css'],
    },
  }

  it('collects entry and imported chunk CSS without duplicates', () => {
    expect(collectViteCss(manifest, manifest['virtual:pagemint-app'])).toEqual([
      'build/assets/app-123.css',
      'build/assets/vendor-456.css',
    ])
  })

  it('resolves Vite manifest entries to a PageMint client manifest', () => {
    const assets = resolveViteClientAssets(manifest, {
      moduleId: 'app',
      entryName: 'app',
      publicPath: '/static/',
    })

    expect(assets.styles).toEqual([
      '/static/build/assets/app-123.css',
      '/static/build/assets/vendor-456.css',
    ])
    expect(resolveClientScripts(assets.manifest, ['app']).map((script) => script.src)).toEqual([
      '/static/build/assets/app-123.js',
    ])
  })

  it('generates a compatibility script from resolved Vite assets', () => {
    const assets = resolveViteClientAssets(manifest, {
      moduleId: 'app',
      entrySrc: 'virtual:pagemint-app',
    })
    const script = viteClientShimScript(assets, 'app')

    expect(script).toContain('document.createElement(\'link\')')
    expect(script).toContain('/static/build/assets/app-123.css')
    expect(script).toContain('/static/build/assets/app-123.js')
  })
})
