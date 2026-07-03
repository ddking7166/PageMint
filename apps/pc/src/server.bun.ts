import { createPcApp } from './app.js'
import { loadAppConfig } from './config/app-config.js'

interface BunServer {
  url: URL
  stop(closeActiveConnections?: boolean): void
}

declare const Bun: {
  serve(options: {
    port: number
    fetch(request: Request): Response | Promise<Response>
  }): BunServer
}

const appConfig = loadAppConfig()
const app = createPcApp()
const port = appConfig.server.port

const server = Bun.serve({
  port,
  fetch(request) {
    return app.fetch(request)
  },
})

console.log(`PageMint PC app running with Bun at ${server.url}`)
