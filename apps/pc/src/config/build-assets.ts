import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadAppConfig } from './app-config.js'

const args = new Set(process.argv.slice(2))
const watch = args.has('--watch')
const appRoot = fileURLToPath(new URL('../..', import.meta.url))
const appConfig = loadAppConfig()

if (appConfig.styles.engine !== 'tailwind') {
  throw new Error(`Unsupported styles.engine "${appConfig.styles.engine}"`)
}

if (!watch) {
  cleanBuildOutput()
}

const viteArgs = [
  'build',
  '--config',
  'vite.config.ts',
]

if (watch) {
  viteArgs.push('--watch')
}

const child = spawn('vite', viteArgs, {
  cwd: appRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})

function cleanBuildOutput(): void {
  rmSync(path.resolve(appRoot, 'src/static/build'), { recursive: true, force: true })
  rmSync(path.resolve(appRoot, 'src/static/.vite'), { recursive: true, force: true })
  for (const copiedPublicDir of ['assets', 'common', 'h5', 'load']) {
    rmSync(path.resolve(appRoot, 'src/static', copiedPublicDir), { recursive: true, force: true })
  }

  const cssOutput = safeStaticCssOutput(appConfig.styles.output)
  if (cssOutput) {
    rmSync(path.resolve(appRoot, cssOutput), { force: true })
  }
}

function safeStaticCssOutput(output: string): string | null {
  const normalized = output.replace(/\\/g, '/').replace(/^\.\/+/, '')
  if (!normalized.startsWith('src/static/') || !normalized.endsWith('.css')) return null
  if (normalized.includes('..')) return null
  return normalized
}
