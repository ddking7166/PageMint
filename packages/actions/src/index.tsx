import type { Child } from 'hono/jsx'

export interface ActionButtonProps {
  action: string
  payload?: unknown
  children?: Child
  type?: 'button' | 'submit' | 'reset'
  class?: string
  id?: string
  disabled?: boolean
  title?: string
  [attribute: `data-${string}`]: unknown
  [attribute: `aria-${string}`]: unknown
}

export function ActionButton({
  action,
  payload,
  children,
  type = 'button',
  ...attrs
}: ActionButtonProps) {
  return (
    <button
      {...attrs}
      type={type}
      data-action={action}
      data-payload={payload === undefined ? undefined : JSON.stringify(payload)}
    >
      {children}
    </button>
  )
}

export type {
  ActionContext,
  ActionHandler,
  ActionRuntimeOptions,
  RegisteredAction,
} from './runtime.js'
export {
  clearActions,
  dispatchAction,
  getAction,
  installActionRuntime,
  listActions,
  registerAction,
  unregisterAction,
} from './runtime.js'
