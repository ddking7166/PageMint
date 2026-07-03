/** @jsxImportSource hono/jsx */
import { describe, expect, it } from 'vitest'

import {
  getIslandRuntimeScript,
  injectIslandRuntime,
  Island,
  island,
  mount,
  createPMStore,
  renderToHtml,
} from '../dist/index.js'

describe('islands', () => {
  it('renders island metadata and automatically injects the local mount runtime', async () => {
    const html = await renderToHtml(
      <html>
        <body>
          <Island id="counter" client="vanilla" props={{ initial: 1 }}>
            <button>1</button>
          </Island>
        </body>
      </html>,
    )

    expect(html).toContain('data-pagemint-island')
    expect(html).toContain('data-pagemint-island-id="counter"')
    expect(html).toContain('data-pagemint-client="vanilla"')
    expect(html).toContain('data-pagemint-island-meta="counter"')
    expect(html).toContain('data-pagemint-island-runtime="true"')
    expect(html).toContain('registerIsland')
    expect(html).not.toContain('react-dom')
  })

  it('does not inject a duplicate island runtime', () => {
    const once = injectIslandRuntime('<pagemint-island data-pagemint-island="true"></pagemint-island>')
    const twice = injectIslandRuntime(once)

    expect(twice.match(/data-pagemint-island-runtime="true"/g)).toHaveLength(1)
  })

  it('exposes island definitions, signal runtime, and mount escape hatch', () => {
    expect(island({ id: 'counter', hydrate: true })).toEqual({
      id: 'counter',
      client: 'vanilla',
      hydrate: true,
      store: undefined,
      component: undefined,
      props: undefined,
      src: undefined,
    })
    expect(getIslandRuntimeScript()).toContain('function signal')
    expect(getIslandRuntimeScript()).toContain('function createPMStore')
    expect(getIslandRuntimeScript()).toContain('function mountSignalIsland')
    expect(getIslandRuntimeScript()).toContain('function mount')
    expect(mount('#app')).toContain('PageMint.mount("#app"')
  })

  it('injects store snapshots for signal islands without React hydration', async () => {
    const store = createPMStore({
      cartCount: 2,
    })
    const html = await renderToHtml(
      <html>
        <body>
          <Island id="cart" client="signal">
            <span data-pm-text="cartCount">{store.state.cartCount}</span>
          </Island>
        </body>
      </html>,
      {
        islands: {
          store,
        },
      },
    )

    expect(html).toContain('data-pagemint-client="signal"')
    expect(html).toContain('data-pagemint-store="true"')
    expect(html).toContain('data-pagemint-store-state="true"')
    expect(html).toContain('"cartCount":2')
    expect(html).toContain('createPMStore')
    expect(html).not.toContain('react-dom')
  })

  it('supports direct store injection from Island props', async () => {
    const store = createPMStore({
      cartCount: 3,
    })
    const html = await renderToHtml(
      <html>
        <body>
          <Island id="cart" client="signal" store={store}>
            <span data-pm-text="cartCount">{store.state.cartCount}</span>
          </Island>
        </body>
      </html>,
    )

    expect(html).toContain('data-pagemint-store-state="true"')
    expect(html).toContain('"cartCount":3')
  })
})
