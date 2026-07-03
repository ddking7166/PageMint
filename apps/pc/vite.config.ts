import tailwindcss from '@tailwindcss/vite'
import { defineConfig, normalizePath } from 'vite'

import { loadAppConfig } from './src/config/app-config.js'

const appConfig = loadAppConfig()
const staticDir = 'src/static'
const styleInput = rootAbsolute(appConfig.styles.input)
const pcCssInput = rootAbsolute('src/static/pc.css')
const clientInput = rootAbsolute('src/client/fanke/main.js')
const cssOutput = staticRelative(appConfig.styles.output) ?? 'tailwind.css'
const virtualEntryId = 'virtual:pagemint-fanke-client'
const resolvedVirtualEntryId = `\0${virtualEntryId}`

export default defineConfig({
  root: '.',
  publicDir: false,
  plugins: [
    {
      name: 'pagemint-client-entry',
      resolveId(id) {
        if (id === virtualEntryId) return resolvedVirtualEntryId
        return null
      },
      load(id) {
        if (id !== resolvedVirtualEntryId) return null
        return [
          `import ${JSON.stringify(styleInput)}`,
          `import ${JSON.stringify(pcCssInput)}`,
          `import ${JSON.stringify(clientInput)}`,
        ].join('\n')
      },
    },
    tailwindcss(),
  ],
  build: {
    outDir: staticDir,
    emptyOutDir: false,
    manifest: true,
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    target: 'es2020',
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      external(id) {
        return /^\/(?:assets|common|h5|load)\//.test(id)
      },
      input: {
        'fanke-client': virtualEntryId,
      },
      output: {
        entryFileNames: 'build/assets/[name]-[hash].js',
        chunkFileNames: 'build/assets/[name]-[hash].js',
        assetFileNames(assetInfo) {
          const names = [
            assetInfo.name,
            ...('names' in assetInfo ? assetInfo.names ?? [] : []),
          ].filter(Boolean)
          if (names.some((name) => name?.endsWith('.css'))) return cssOutput
          return 'build/assets/[name]-[hash][extname]'
        },
      },
    },
  },
})

function rootAbsolute(path: string): string {
  return `/${normalizePath(path).replace(/^\.?\//, '')}`
}

function staticRelative(path: string): string | null {
  const normalized = normalizePath(path).replace(/^\.?\//, '')
  if (!normalized.startsWith(`${staticDir}/`) || !normalized.endsWith('.css')) {
    return null
  }
  return normalized.slice(staticDir.length + 1)
}
