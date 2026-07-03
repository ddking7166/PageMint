import { definePageMintConfig } from './config/define-config.js'

export default definePageMintConfig({
  server: {
    port: 3001,
  },
  cache: {
    driver: 'memory',
    fileDir: '.pagemint/cache',
  },
  database: {
    url: '',
  },
  redis: {
    url: '',
  },
  client: {
    modules: ['pc:fanke'],
    scripts: [],
  },
  styles: {
    input: 'src/styles/app.css',
    output: 'src/static/tailwind.css',
    engine: 'tailwind',
  },
  thirdParty: {
    fanke: {
      publicApiBaseUrl: '/ysapi',
      serverApiBaseUrl: '',
      publicApiKey: '',
      mmsAppId: '',
      publicBncImageKey: '',
      publicCdnBaseUrl: '',
      publicSiteUrl: 'http://localhost:3001',
      publicPcSiteUrl: 'http://localhost:3001',
      publicH5SiteUrl: 'http://localhost:3002',
    },
  },
})
