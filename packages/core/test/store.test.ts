import { describe, expect, it } from 'vitest'

import { createPMStore, createStore, watch, withPMStore, usePMStore } from '../dist/index.js'

describe('PM Store', () => {
  it('notifies subscribers and watchers from proxy state changes', async () => {
    const store = createPMStore({
      cartCount: 0,
      cart: {
        total: 1,
      },
    })
    const subscriberCalls: string[] = []
    const watchedTotals: number[] = []

    store.subscribe((_state, change) => {
      subscriberCalls.push(change.type)
    })
    store.watch(
      () => store.state.cart.total,
      (value) => {
        watchedTotals.push(value)
      },
    )

    store.state.cartCount += 1
    store.state.cart.total = 2
    await tick()

    expect(store.state.cartCount).toBe(1)
    expect(subscriberCalls).toEqual(['init', 'batch'])
    expect(watchedTotals).toEqual([1, 2])
  })

  it('supports top-level watch, event bus, actions, and snapshots', async () => {
    const store = createStore({
      state: {
        cartCount: 0,
      },
      actions: {
        cart: {
          add(currentStore) {
            currentStore.state.cartCount += 1
          },
        },
      },
    })
    const values: number[] = []
    const events: unknown[] = []

    const stopWatch = withPMStore(store, () => {
      return watch(
        () => store.state.cartCount,
        (value) => {
          values.push(value)
        },
      )
    })
    store.on('cart:add', (payload) => {
      events.push(payload)
    })

    const add = store.actions.cart?.add
    expect(typeof add).toBe('function')
    if (typeof add === 'function') {
      add()
    }
    store.emit('cart:add', { id: 1 })
    await tick()

    stopWatch()
    expect(values).toEqual([0, 1])
    expect(events).toEqual([{ id: 1 }])
    expect(store.snapshot()).toEqual({ cartCount: 1 })
  })

  it('scopes usePMStore with withPMStore', () => {
    const store = createPMStore({
      user: {
        name: 'Ada',
      },
    })

    const name = withPMStore(store, () => usePMStore<typeof store.state>().state.user.name)

    expect(name).toBe('Ada')
  })
})

function tick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}
