export function createDataHash(data: unknown): string {
  const serialized = stableStringify(data)
  let hash = 5381

  for (let i = 0; i < serialized.length; i += 1) {
    hash = (hash * 33) ^ serialized.charCodeAt(i)
  }

  return `djb2:${(hash >>> 0).toString(36)}`
}

export function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>()

  return JSON.stringify(normalize(value, seen))
}

function normalize(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'bigint') {
      return value.toString()
    }
    return value
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (value instanceof URL) {
    return value.toString()
  }

  if (value instanceof URLSearchParams) {
    return Array.from(value.entries()).sort()
  }

  if (seen.has(value)) {
    return '[Circular]'
  }
  seen.add(value)

  if (Array.isArray(value)) {
    return value.map((item) => normalize(item, seen))
  }

  const record = value as Record<string, unknown>
  const normalized: Record<string, unknown> = {}

  for (const key of Object.keys(record).sort()) {
    const child = record[key]
    if (child !== undefined && typeof child !== 'function') {
      normalized[key] = normalize(child, seen)
    }
  }

  return normalized
}
