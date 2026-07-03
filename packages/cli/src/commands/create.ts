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
    writeFile(path.join(targetDir, 'src/app.ts'), appSource(), 'utf8'),
    writeFile(path.join(targetDir, 'src/pages/index.page.tsx'), homeSource(), 'utf8'),
    writeFile(path.join(targetDir, 'src/pages/layout.tsx'), layoutSource(), 'utf8'),
    writeFile(path.join(targetDir, 'src/components/Counter.tsx'), counterSource(), 'utf8'),
    writeFile(path.join(targetDir, 'src/static/islands.js'), islandsSource(), 'utf8'),
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
import { memoryCache } from '@pagemint/cache-memory'
import { createPageMintApp, registerFileRoutes } from '@pagemint/hono'
import { readFile } from 'node:fs/promises'

const app = createPageMintApp({
  cache: memoryCache(),
})

app.addDependency('movie:featured', 'homepage')
app.addDependency('movie:featured', 'search')

await registerFileRoutes(app, {
  pagesDir: new URL('./pages', import.meta.url),
})

app.get('/static/islands.js', async (c) => {
  return c.text(await readFile('src/static/islands.js', 'utf8'), 200, {
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
  return `import { Island } from '@pagemint/hono'

import { Counter } from '../components/Counter.js'

import type { FilePageOptions } from '@pagemint/hono'

interface HomeRawData {
  title: string
  items: string[]
  counterStart: number
}

interface HomeModel {
  title: string
  items: string[]
  counterStart: number
}

export default {
  cache: {
    ttl: 60_000,
    staleTtl: 5 * 60_000,
    tags: ['homepage'],
    modelHash: (model) => model.items.join('|'),
  },
  async load() {
    return {
      title: 'PageMint v1',
      items: ['Server JSX', 'HTML Cache', 'Revalidate', 'Islands', 'File Routing'],
      counterStart: 1,
    }
  },
  normalize(raw) {
    return {
      title: raw.title,
      items: raw.items.map((item) => item.trim()).filter(Boolean),
      counterStart: raw.counterStart,
    }
  },
  dependencies() {
    return [
      'homepage',
      {
        id: 'movie:featured',
        affects: ['homepage', 'search'],
      },
    ]
  },
  render({ data }) {
    return (
      <main>
        <h1>{data.title}</h1>
        <p>Server JSX rendered once, cached by route, and sent as HTML.</p>
        <ul>
          {data.items.map((item) => (
            <li>{item}</li>
          ))}
        </ul>
        <Island id="counter" client="vanilla" props={{ initial: data.counterStart }}>
          <Counter initial={data.counterStart} />
        </Island>
      </main>
    )
  },
} satisfies FilePageOptions<HomeRawData, HomeModel>
`
}

function layoutSource(): string {
  return `import type { FileLayoutProps } from '@pagemint/hono'

export default function Layout({ children }: FileLayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>PageMint v1</title>
        <script type="module" src="/static/islands.js"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}
`
}

function counterSource(): string {
  return `export interface CounterProps {
  initial: number
}

export function Counter({ initial }: CounterProps) {
  return (
    <button type="button" data-counter>
      Count: {initial}
    </button>
  )
}
`
}

function islandsSource(): string {
  return `function counter({ el, props, signal }) {
  const count = signal(Number(props?.initial ?? 0))
  const button = el.querySelector('[data-counter]')
  if (!button) return

  count.subscribe((value) => {
    button.textContent = \`Count: \${value}\`
  })
  button.addEventListener('click', () => {
    count.value += 1
  })
}

window.PageMintIslands = {
  ...window.PageMintIslands,
  counter,
}

window.PageMint?.registerIsland?.('counter', counter)
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
