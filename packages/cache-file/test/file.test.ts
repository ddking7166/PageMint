import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { fileCache } from '../dist/index.js'

describe('fileCache', () => {
  it('overwrites cached HTML and metadata atomically', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'pagemint-cache-'))
    const cache = fileCache({ dir })

    try {
      await cache.set('page:/atomic', {
        html: '<html>v1</html>',
        modelHash: 'v1',
        createdAt: 1,
        updatedAt: 1,
        tags: ['movie:1'],
      })
      await cache.set('page:/atomic', {
        html: '<html>v2</html>',
        modelHash: 'v2',
        createdAt: 1,
        updatedAt: 2,
        tags: ['movie:2'],
        dependencies: ['movie:2'],
      })

      await expect(cache.get('page:/atomic')).resolves.toMatchObject({
        html: '<html>v2</html>',
        modelHash: 'v2',
        tags: ['movie:2'],
        dependencies: ['movie:2'],
      })
      expect((await readdir(dir)).some((file) => file.endsWith('.tmp'))).toBe(false)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
