import { describe, expect, it } from 'vitest'

import { memoryCache } from '../dist/index.js'

describe('memoryCache', () => {
  it('sets, gets, checks, and deletes entries', async () => {
    const cache = memoryCache()
    const entry = {
      html: '<html></html>',
      createdAt: 1,
      updatedAt: 1,
      headers: {
        'x-test': 'yes',
      },
    }

    await cache.set('page:/', entry)

    expect(await cache.has('page:/')).toBe(true)
    expect(await cache.get('page:/')).toEqual(entry)

    await cache.delete('page:/')
    expect(await cache.get('page:/')).toBeNull()
  })

  it('returns cloned entries so callers cannot mutate stored state', async () => {
    const cache = memoryCache()
    await cache.set('page:/clone', {
      html: '<html></html>',
      createdAt: 1,
      updatedAt: 1,
      tags: ['original'],
      headers: {
        'x-test': 'yes',
      },
    })

    const entry = await cache.get('page:/clone')
    if (entry?.headers) {
      entry.headers['x-test'] = 'mutated'
    }
    entry?.tags?.push('mutated')

    await expect(cache.get('page:/clone')).resolves.toMatchObject({
      tags: ['original'],
      headers: {
        'x-test': 'yes',
      },
    })
  })
})
