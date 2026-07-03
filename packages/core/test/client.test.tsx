/** @jsxImportSource hono/jsx */
import { describe, expect, it } from 'vitest'

import {
  ClientScripts,
  clientScriptAttrs,
  defineClientManifest,
  renderToHtml,
  resolveClientScripts,
} from '../dist/index.js'

describe('client scripts', () => {
  it('resolves dependencies, defaults, extra modules, and custom scripts in order', () => {
    const manifest = defineClientManifest({
      defaultModules: ['app'],
      modules: {
        vendor: {
          scripts: [
            { src: '/static/vendor.js', type: 'classic', defer: true },
          ],
        },
        app: {
          dependsOn: ['vendor'],
          scripts: ['/static/app.js'],
        },
        detail: {
          dependsOn: ['app'],
          scripts: ['/static/detail.js'],
        },
      },
    })

    const scripts = resolveClientScripts(manifest, {
      modules: ['detail'],
      scripts: ['/static/app.js', { src: '/static/custom.js', attrs: { 'data-app': 'pc' } }],
    })

    expect(scripts.map((script) => script.src)).toEqual([
      '/static/vendor.js',
      '/static/app.js',
      '/static/detail.js',
      '/static/custom.js',
    ])
    expect(scripts[0]?.type).toBe('classic')
    expect(scripts[1]?.type).toBe('module')
  })

  it('throws for unknown modules', () => {
    const manifest = defineClientManifest({
      modules: {
        app: { scripts: ['/static/app.js'] },
      },
    })

    expect(() => resolveClientScripts(manifest, ['missing'])).toThrow(
      'Unknown PageMint client module "missing"',
    )
  })

  it('throws for circular dependencies', () => {
    const manifest = defineClientManifest({
      modules: {
        a: { dependsOn: ['b'], scripts: ['/a.js'] },
        b: { dependsOn: ['a'], scripts: ['/b.js'] },
      },
    })

    expect(() => resolveClientScripts(manifest, ['a'])).toThrow(
      'Circular PageMint client module dependency "a"',
    )
  })

  it('builds script attributes for module and classic scripts', () => {
    expect(clientScriptAttrs('/static/app.js')).toEqual({
      src: '/static/app.js',
      type: 'module',
    })
    expect(clientScriptAttrs({
      src: '/static/vendor.js',
      type: 'classic',
      defer: true,
      attrs: {
        'data-runtime': 'vendor',
        ignored: false,
      },
    })).toEqual({
      src: '/static/vendor.js',
      defer: true,
      'data-runtime': 'vendor',
    })
  })

  it('renders client scripts as JSX', async () => {
    const manifest = defineClientManifest({
      modules: {
        app: { scripts: ['/static/app.js'] },
      },
    })

    const html = await renderToHtml(
      <html>
        <head>
          <ClientScripts manifest={manifest} modules={['app']} nonce="abc" />
        </head>
      </html>,
    )

    expect(html).toContain('src="/static/app.js"')
    expect(html).toContain('type="module"')
    expect(html).toContain('nonce="abc"')
  })
})
