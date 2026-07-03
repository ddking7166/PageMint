/** @jsxImportSource hono/jsx */
import { describe, expect, it } from 'vitest'

import { renderToHtml } from '../dist/index.js'

describe('renderToHtml', () => {
  it('renders Hono JSX to an HTML string with doctype for full documents', async () => {
    const html = await renderToHtml(
      <html>
        <head>
          <title>PageMint</title>
        </head>
        <body>
          <h1>Hello</h1>
        </body>
      </html>,
    )

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<h1>Hello</h1>')
  })
})
