import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { CacheEntry, CacheStore } from '@pagemint/core'

export interface FileCacheOptions {
  dir: string
}

interface FileCacheMeta extends Omit<CacheEntry, 'html'> {
  key: string
}

export function fileCache(options: FileCacheOptions): CacheStore {
  const root = options.dir

  return {
    async get(key) {
      const paths = cachePaths(root, key)

      try {
        const [metaRaw, html] = await Promise.all([
          readFile(paths.meta, 'utf8'),
          readFile(paths.html, 'utf8'),
        ])
        const meta = JSON.parse(metaRaw) as FileCacheMeta
        if (meta.key !== key) {
          return null
        }

        const { key: _key, ...entryMeta } = meta
        return {
          ...entryMeta,
          html,
        }
      } catch (error) {
        if (isNotFoundError(error)) {
          return null
        }
        throw error
      }
    },

    async set(key, entry) {
      await mkdir(root, { recursive: true })
      const paths = cachePaths(root, key)
      const meta: FileCacheMeta = {
        key,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      }

      if (entry.dataHash !== undefined) meta.dataHash = entry.dataHash
      if (entry.expireAt !== undefined) meta.expireAt = entry.expireAt
      if (entry.staleAt !== undefined) meta.staleAt = entry.staleAt
      if (entry.status !== undefined) meta.status = entry.status
      if (entry.tags !== undefined) meta.tags = entry.tags
      if (entry.headers !== undefined) meta.headers = entry.headers

      await Promise.all([
        writeAtomic(paths.html, entry.html),
        writeAtomic(paths.meta, `${JSON.stringify(meta, null, 2)}\n`),
      ])
    },

    async delete(key) {
      const paths = cachePaths(root, key)
      await Promise.all([
        rm(paths.html, { force: true }),
        rm(paths.meta, { force: true }),
      ])
    },

    async has(key) {
      const entry = await this.get(key)
      return entry !== null
    },
  }
}

export { fileCache as createFileCache }

function cachePaths(root: string, key: string): { html: string; meta: string } {
  const hashedKey = createHash('sha256').update(key).digest('hex')
  return {
    html: path.join(root, `${hashedKey}.html`),
    meta: path.join(root, `${hashedKey}.json`),
  }
}

async function writeAtomic(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tempPath, content, 'utf8')
  await rename(tempPath, filePath)
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ENOENT'
  )
}
