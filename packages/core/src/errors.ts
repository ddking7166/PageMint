import type { PageMintErrorContext } from './types.js'

export class PageMintError extends Error {
  readonly context: PageMintErrorContext
  readonly cause?: unknown

  constructor(message: string, context: PageMintErrorContext, cause?: unknown) {
    super(message)
    this.name = 'PageMintError'
    this.context = context
    this.cause = cause
  }
}
