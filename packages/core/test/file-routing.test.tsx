/** @jsxImportSource hono/jsx */
import { describe, expect, it } from 'vitest'

import {
  defineFilePage,
  filePathToRoutePath,
  renderPageResult,
} from '../dist/index.js'

describe('file routing', () => {
  it('converts page file paths to route paths with dynamic params', () => {
    expect(filePathToRoutePath('/app/pages/index.page.tsx', '/app/pages')).toBe('/')
    expect(filePathToRoutePath('/app/pages/movies/[id].page.tsx', '/app/pages')).toBe('/movies/:id')
    expect(filePathToRoutePath('/app/pages/docs/[...slug].page.tsx', '/app/pages')).toBe('/docs/:slug*')
  })

  it('wraps file pages with nested layouts', async () => {
    const page = defineFilePage(
      '/movies/:id',
      {
        load() {
          return { title: 'Movie' }
        },
        render({ data }) {
          return <main>{data.title}</main>
        },
      },
      [
        {
          default({ children }) {
            return <html><body><section>{children}</section></body></html>
          },
        },
      ],
    )

    const rendered = await renderPageResult(
      await page.render({
        request: new Request('http://localhost/movies/1'),
        params: { id: '1' },
        query: new URLSearchParams(),
        pathname: '/movies/1',
        data: { title: 'Movie' },
        model: { title: 'Movie' },
      }),
    )

    expect(page.path).toBe('/movies/:id')
    expect(rendered.html).toContain('<section><main>Movie</main></section>')
  })
})
