import { mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

export async function createCommand(args: string[]): Promise<void> {
  const name = args[0]
  if (!name) {
    throw new Error('Missing project name. Usage: create-pagemint <name>')
  }

  const targetDir = path.resolve(process.cwd(), name)
  await assertWritableTarget(targetDir)
  await writeProject(targetDir, name)

  console.log(`Created PageMint app in ${targetDir}

Next steps:
  cd ${name}
  pnpm install
  pnpm dev
`)
}

async function assertWritableTarget(targetDir: string): Promise<void> {
  try {
    const files = await readdir(targetDir)
    if (files.length > 0) {
      throw new Error(`Target directory is not empty: ${targetDir}`)
    }
  } catch (error) {
    if (isNotFoundError(error)) {
      return
    }
    throw error
  }
}

async function writeProject(targetDir: string, name: string): Promise<void> {
  const dirs = [
    targetDir,
    path.join(targetDir, 'src'),
    path.join(targetDir, 'src/pages'),
    path.join(targetDir, 'src/components'),
    path.join(targetDir, 'src/static'),
  ]

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true })
  }

  await Promise.all([
    writeJson(path.join(targetDir, 'package.json'), packageJson(name)),
    writeFile(path.join(targetDir, 'tsconfig.json'), tsconfig(), 'utf8'),
    writeFile(path.join(targetDir, 'src/app.tsx'), appSource(), 'utf8'),
    writeFile(path.join(targetDir, 'src/pages/home.tsx'), homeSource(), 'utf8'),
    writeFile(path.join(targetDir, 'src/components/Layout.tsx'), layoutSource(), 'utf8'),
    writeFile(path.join(targetDir, 'src/components/Button.tsx'), buttonSource(), 'utf8'),
    writeFile(path.join(targetDir, 'src/static/actions.js'), actionsSource(), 'utf8'),
  ])
}

function packageJson(name: string): Record<string, unknown> {
  return {
    name,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'tsx watch src/app.tsx',
      build: 'tsc -p tsconfig.json',
      start: 'node dist/app.js',
    },
    dependencies: {
      '@hono/node-server': '^2.0.6',
      '@pagemint/actions': '^0.1.0',
      '@pagemint/cache-memory': '^0.1.0',
      '@pagemint/hono': '^0.1.0',
      hono: '^4.12.27',
    },
    devDependencies: {
      tsx: '^4.22.4',
      typescript: '^6.0.3',
    },
  }
}

function tsconfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        strict: true,
        skipLibCheck: true,
        jsx: 'react-jsx',
        jsxImportSource: 'hono/jsx',
        outDir: 'dist',
        rootDir: 'src',
      },
      include: ['src/**/*.ts', 'src/**/*.tsx'],
    },
    null,
    2,
  )}\n`
}

function appSource(): string {
  return `import { serve } from '@hono/node-server'
import { createPageMintApp, definePage } from '@pagemint/hono'
import { memoryCache } from '@pagemint/cache-memory'

import { HomePage } from './pages/home.js'

const app = createPageMintApp({
  cache: memoryCache(),
})

app.page(
  definePage({
    path: '/',
    cache: {
      ttl: 60_000,
      staleTtl: 5 * 60_000,
    },
    async load() {
      return {
        title: 'PageMint',
        items: ['Hono', 'Server JSX', 'Route HTML Cache'],
      }
    },
    render({ data }) {
      return <HomePage title={data.title} items={data.items} />
    },
  }),
)

app.get('/static/actions.js', async (c) => {
  return c.text(await import('node:fs/promises').then((fs) => fs.readFile('src/static/actions.js', 'utf8')), 200, {
    'content-type': 'text/javascript; charset=UTF-8',
  })
})

const port = Number(process.env.PORT ?? 3000)
serve({ fetch: app.fetch, port })
console.log(\`PageMint dev server running at http://localhost:\${port}\`)

export default app
`
}

function homeSource(): string {
  return `import { Button } from '../components/Button.js'
import { Layout } from '../components/Layout.js'

export interface HomePageProps {
  title: string
  items: string[]
}

export function HomePage({ title, items }: HomePageProps) {
  return (
    <Layout title={title}>
      <main>
        <h1>{title}</h1>
        <p>Server JSX rendered once, cached by route, and sent as HTML.</p>
        <ul>
          {items.map((item) => (
            <li>{item}</li>
          ))}
        </ul>
        <Button action="demo.toast" payload={{ message: 'Hello from data-action' }}>
          Try action
        </Button>
      </main>
    </Layout>
  )
}
`
}

function layoutSource(): string {
  return `import type { Child } from 'hono/jsx'

export interface LayoutProps {
  title: string
  children: Child
}

export function Layout({ title, children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <script type="module" src="/static/actions.js"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}
`
}

function buttonSource(): string {
  return `import { ActionButton } from '@pagemint/actions'
import type { Child } from 'hono/jsx'

export interface ButtonProps {
  action: string
  payload?: unknown
  children: Child
}

export function Button(props: ButtonProps) {
  return <ActionButton {...props} />
}
`
}

function actionsSource(): string {
  return `const actions = new Map()

export function registerAction(name, handler) {
  actions.set(name, handler)
}

document.addEventListener('click', async (event) => {
  const el = event.target.closest('[data-action]')
  if (!el) return

  const action = el.dataset.action
  const handler = actions.get(action)
  if (!handler) return

  event.preventDefault()
  const payload = el.dataset.payload ? JSON.parse(el.dataset.payload) : undefined
  await handler({ payload, el, event })
})

registerAction('demo.toast', ({ payload }) => {
  alert(payload.message)
})
`
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ENOENT'
  )
}
