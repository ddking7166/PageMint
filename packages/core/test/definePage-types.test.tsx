/** @jsxImportSource hono/jsx */
import { describe, expect, expectTypeOf, it } from 'vitest'

import { definePage } from '../dist/index.js'

describe('definePage types', () => {
  it('preserves load data type for render context', () => {
    const page = definePage({
      path: '/',
      load() {
        return {
          title: 'Typed Page',
          count: 1,
        }
      },
      render({ data }) {
        expectTypeOf(data.title).toEqualTypeOf<string>()
        expectTypeOf(data.count).toEqualTypeOf<number>()
        return <html><body>{data.title}</body></html>
      },
    })

    expect(page.path).toBe('/')
  })
})
