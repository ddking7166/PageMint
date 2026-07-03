import type { DefinePageOptions, RegisteredPage } from './types.js'

export function definePage<TRawData, TModel = TRawData>(
  options: DefinePageOptions<TRawData, TModel>,
): DefinePageOptions<TRawData, TModel> {
  return options
}

export interface PathMatch {
  params: Record<string, string>
}

interface SegmentToken {
  kind: 'static' | 'param' | 'wildcard'
  value: string
}

export function matchPath(pattern: string, pathname: string): PathMatch | null {
  const patternTokens = tokenize(pattern)
  const pathTokens = normalizePath(pathname)

  const wildcardToken = patternTokens.at(-1)
  const hasWildcard = wildcardToken?.kind === 'wildcard'

  if (!hasWildcard && patternTokens.length !== pathTokens.length) {
    return null
  }

  if (hasWildcard && pathTokens.length < patternTokens.length - 1) {
    return null
  }

  const params: Record<string, string> = {}

  for (let i = 0; i < patternTokens.length; i += 1) {
    const patternToken = patternTokens[i]
    const pathToken = pathTokens[i]

    if (!patternToken) {
      return null
    }

    if (patternToken.kind === 'wildcard') {
      params[patternToken.value] = pathTokens
        .slice(i)
        .map((segment) => decodeURIComponent(segment))
        .join('/')
      return { params }
    }

    if (pathToken === undefined) {
      return null
    }

    if (patternToken.kind === 'static') {
      if (patternToken.value !== pathToken) {
        return null
      }
      continue
    }

    params[patternToken.value] = decodeURIComponent(pathToken)
  }

  return { params }
}

export function findMatchingPage(
  pages: RegisteredPage[],
  pathname: string,
): { page: RegisteredPage; params: Record<string, string> } | null {
  for (const page of pages) {
    const match = matchPath(page.options.path, pathname)
    if (match) {
      return { page, params: match.params }
    }
  }

  return null
}

function tokenize(pattern: string): SegmentToken[] {
  return normalizePath(pattern).map((segment, index, segments) => {
    if (segment === '*') {
      assertTrailingWildcard(pattern, index, segments)
      return { kind: 'wildcard', value: '*' }
    }

    if (segment.startsWith(':') && segment.endsWith('*')) {
      assertTrailingWildcard(pattern, index, segments)
      const value = segment.slice(1, -1)
      if (!value) {
        throw new Error(`Invalid route segment "${segment}" in "${pattern}"`)
      }
      return { kind: 'wildcard', value }
    }

    if (segment.startsWith(':')) {
      const value = segment.slice(1)
      if (!value) {
        throw new Error(`Invalid route segment "${segment}" in "${pattern}"`)
      }
      return { kind: 'param', value }
    }

    return { kind: 'static', value: segment }
  })
}

function assertTrailingWildcard(pattern: string, index: number, segments: string[]): void {
  if (index !== segments.length - 1) {
    throw new Error(`Wildcard route segment must be last in "${pattern}"`)
  }
}

function normalizePath(pathname: string): string[] {
  const trimmed = pathname.split('?')[0]?.replace(/^\/+|\/+$/g, '') ?? ''
  if (!trimmed) {
    return []
  }

  return trimmed.split('/')
}
