import { serve } from '@hono/node-server'

import { createPcApp } from './app.js'
import { loadAppConfig } from './config/app-config.js'

const appConfig = loadAppConfig()
const app = createPcApp()

const port = appConfig.server.port
serve({ fetch: app.fetch, port })
console.log(`PageMint PC app running at http://localhost:${port}`)

export default app
