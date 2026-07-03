export type AnyRecord = Record<string, any>

export function asArray<T = AnyRecord>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object') {
    const record = value as AnyRecord
    if (Array.isArray(record.data)) return record.data as T[]
    if (Array.isArray(record.items)) return record.items as T[]
    if (Array.isArray(record.list)) return record.list as T[]
  }
  return []
}

export function text(value: unknown, fallback = ''): string {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

export function firstRecord(...values: unknown[]): AnyRecord {
  for (const value of values) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as AnyRecord
    }
  }
  return {}
}
