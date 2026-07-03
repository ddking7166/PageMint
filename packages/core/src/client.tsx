export type ClientScriptType = 'module' | 'classic'

export type ClientScriptAttributeValue = string | number | boolean | null | undefined

export type ClientScriptInput = string | ClientScript

export interface ClientScript {
  src: string
  type?: ClientScriptType
  async?: boolean
  defer?: boolean
  integrity?: string
  nonce?: string
  crossorigin?: 'anonymous' | 'use-credentials'
  referrerpolicy?: string
  attrs?: Record<string, ClientScriptAttributeValue>
}

export interface ClientModule {
  scripts: ClientScriptInput[]
  dependsOn?: string[]
}

export interface ClientManifest {
  defaultModules?: string[]
  modules: Record<string, ClientModule>
}

export interface ResolveClientScriptsOptions {
  modules?: string[]
  scripts?: ClientScriptInput[]
}

export interface ClientScriptsProps extends ResolveClientScriptsOptions {
  manifest: ClientManifest
  nonce?: string
}

export function defineClientManifest<TManifest extends ClientManifest>(
  manifest: TManifest,
): TManifest {
  return manifest
}

export function resolveClientScripts(
  manifest: ClientManifest,
  options: ResolveClientScriptsOptions | string[] = {},
): ClientScript[] {
  const resolvedOptions = Array.isArray(options) ? { modules: options } : options
  const moduleIds = [
    ...(manifest.defaultModules ?? []),
    ...(resolvedOptions.modules ?? []),
  ]
  const scripts: ClientScript[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  function visit(moduleId: string): void {
    if (visited.has(moduleId)) return

    const clientModule = manifest.modules[moduleId]
    if (!clientModule) {
      throw new Error(`Unknown PageMint client module "${moduleId}"`)
    }
    if (visiting.has(moduleId)) {
      throw new Error(`Circular PageMint client module dependency "${moduleId}"`)
    }

    visiting.add(moduleId)
    for (const dependency of clientModule.dependsOn ?? []) {
      visit(dependency)
    }
    visiting.delete(moduleId)
    visited.add(moduleId)

    scripts.push(...clientModule.scripts.map(normalizeClientScript))
  }

  for (const moduleId of moduleIds) {
    visit(moduleId)
  }

  scripts.push(...(resolvedOptions.scripts ?? []).map(normalizeClientScript))
  return dedupeClientScripts(scripts)
}

export function ClientScripts({
  manifest,
  modules,
  scripts,
  nonce,
}: ClientScriptsProps) {
  const resolved = resolveClientScripts(manifest, { modules, scripts })

  return (
    <>
      {resolved.map((script) => (
        <script {...clientScriptAttrs(script, nonce)}></script>
      ))}
    </>
  )
}

export function clientScriptAttrs(
  input: ClientScriptInput,
  nonce?: string,
): Record<string, string | number | boolean> {
  const script = normalizeClientScript(input)
  const attrs: Record<string, string | number | boolean> = {
    ...compactAttrs(script.attrs),
    src: script.src,
  }

  if (script.type === 'module' || !script.type) {
    attrs.type = 'module'
  }
  if (script.type === 'classic' && script.defer) {
    attrs.defer = true
  }
  if (script.async) {
    attrs.async = true
  }
  if (script.integrity) {
    attrs.integrity = script.integrity
  }
  if (script.nonce || nonce) {
    attrs.nonce = script.nonce ?? nonce ?? ''
  }
  if (script.crossorigin) {
    attrs.crossorigin = script.crossorigin
  }
  if (script.referrerpolicy) {
    attrs.referrerpolicy = script.referrerpolicy
  }

  return attrs
}

function normalizeClientScript(input: ClientScriptInput): ClientScript {
  return typeof input === 'string' ? { src: input, type: 'module' } : input
}

function dedupeClientScripts(scripts: ClientScript[]): ClientScript[] {
  const seen = new Set<string>()
  const deduped: ClientScript[] = []

  for (const script of scripts) {
    if (seen.has(script.src)) continue
    seen.add(script.src)
    deduped.push(script)
  }

  return deduped
}

function compactAttrs(
  attrs: Record<string, ClientScriptAttributeValue> | undefined,
): Record<string, string | number | boolean> {
  const compacted: Record<string, string | number | boolean> = {}

  for (const [name, value] of Object.entries(attrs ?? {})) {
    if (value === null || value === undefined || value === false) continue
    compacted[name] = value
  }

  return compacted
}
