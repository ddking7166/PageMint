export interface ActionContext<TPayload = unknown> {
  action: string
  payload: TPayload
  el: HTMLElement
  event?: Event
}

export type ActionHandler<TPayload = unknown> =
  | ((ctx: ActionContext<TPayload>) => unknown)
  | ((ctx: ActionContext<TPayload>) => Promise<unknown>)

export interface RegisteredAction {
  name: string
  handler: ActionHandler
}

export interface ActionRuntimeOptions {
  root?: Document | HTMLElement
  preventDefault?: boolean
}

const actions = new Map<string, ActionHandler>()
let installedCleanup: (() => void) | null = null

export function registerAction<TPayload = unknown>(
  name: string,
  handler: ActionHandler<TPayload>,
): void {
  actions.set(name, handler as ActionHandler)
}

export function unregisterAction(name: string): void {
  actions.delete(name)
}

export function clearActions(): void {
  actions.clear()
}

export function getAction(name: string): ActionHandler | undefined {
  return actions.get(name)
}

export function listActions(): RegisteredAction[] {
  return Array.from(actions.entries()).map(([name, handler]) => ({ name, handler }))
}

export async function dispatchAction<TPayload = unknown>(
  ctx: ActionContext<TPayload>,
): Promise<unknown> {
  const handler = actions.get(ctx.action)
  if (!handler) {
    return undefined
  }

  ctx.el.dispatchEvent(
    new CustomEvent('pagemint:action-start', {
      bubbles: true,
      detail: { action: ctx.action, payload: ctx.payload },
    }),
  )

  try {
    const result = await handler(ctx)
    ctx.el.dispatchEvent(
      new CustomEvent('pagemint:action-end', {
        bubbles: true,
        detail: { action: ctx.action, payload: ctx.payload, result },
      }),
    )
    return result
  } catch (error) {
    ctx.el.dispatchEvent(
      new CustomEvent('pagemint:action-error', {
        bubbles: true,
        detail: { action: ctx.action, payload: ctx.payload, error },
      }),
    )
    throw error
  }
}

export function installActionRuntime(options: ActionRuntimeOptions = {}): () => void {
  if (installedCleanup) {
    return installedCleanup
  }

  const root = options.root ?? globalThis.document
  const preventDefault = options.preventDefault ?? true
  const listener = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }

    const el = target.closest<HTMLElement>('[data-action]')
    if (!el) {
      return
    }

    const action = el.dataset.action
    if (!action) {
      return
    }

    if (preventDefault) {
      event.preventDefault()
    }

    void dispatchAction({
      action,
      payload: parsePayload(el.dataset.payload),
      el,
      event,
    })
  }

  root.addEventListener('click', listener)
  installedCleanup = () => {
    root.removeEventListener('click', listener)
    installedCleanup = null
  }

  return installedCleanup
}

function parsePayload(raw: string | undefined): unknown {
  if (!raw) {
    return undefined
  }

  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

if (typeof document !== 'undefined') {
  installActionRuntime()
}
