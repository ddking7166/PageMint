import { ActionButton } from '@pagemint/actions'

import type { Child } from 'hono/jsx'

export interface ButtonProps {
  action: string
  payload?: unknown
  children: Child
}

export function Button(props: ButtonProps) {
  return <ActionButton {...props} class="button" />
}
