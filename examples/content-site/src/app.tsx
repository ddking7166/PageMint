import { serve } from '@hono/node-server'
import { memoryCache } from '@pagemint/cache-memory'
import { createPageMintApp, definePage } from '@pagemint/hono'

import { CategoryPage } from './pages/category.js'
import { DetailPage } from './pages/detail.js'
import { ContentHomePage } from './pages/home.js'

const posts = [
  { slug: 'hello-pagemint', title: 'Hello PageMint', body: 'A content page served as cached HTML.' },
  { slug: 'cache-first', title: 'Cache First', body: 'HTML output can be reused by route key.' },
]

const app = createPageMintApp({
  cache: memoryCache(),
})

app.page(
  definePage({
    path: '/',
    cache: { ttl: 60_000 },
    load() {
      return { posts }
    },
    render({ data }) {
      return <ContentHomePage posts={data.posts} />
    },
  }),
)

app.page(
  definePage({
    path: '/posts/:slug',
    cache: {
      ttl: 5 * 60_000,
      key: ({ params }) => `content:post:${params.slug}`,
    },
    load({ params }) {
      const post = posts.find((item) => item.slug === params.slug)
      if (!post) {
        throw new Error(`Post not found: ${params.slug}`)
      }
      return { post }
    },
    render({ data }) {
      return <DetailPage post={data.post} />
    },
  }),
)

app.page(
  definePage({
    path: '/category/:category',
    cache: { ttl: 5 * 60_000 },
    load({ params }) {
      return { category: params.category }
    },
    render({ data }) {
      return <CategoryPage category={data.category} />
    },
  }),
)

const port = Number(process.env.PORT ?? 3001)
serve({ fetch: app.fetch, port })

export default app
