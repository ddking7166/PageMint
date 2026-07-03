import { Button } from '../components/Button.js'
import { Layout } from '../components/Layout.js'

export interface HomePageProps {
  title: string
  tagline: string
  metrics: Array<{
    value: string
    label: string
  }>
  advantages: Array<{
    title: string
    description: string
  }>
  apiGroups: Array<{
    title: string
    description: string
    apis: Array<{
      name: string
      signature: string
      description: string
      benefit: string
    }>
  }>
  packages: Array<{
    name: string
    label: string
    description: string
  }>
  workflow: Array<{
    title: string
    description: string
  }>
}

const quickstart = `pnpm create pagemint my-app
cd my-app
pnpm dev`

const pageExample = `import { createPageMintApp, definePage } from '@pagemint/hono'
import { memoryCache } from '@pagemint/cache-memory'

const app = createPageMintApp({
  cache: memoryCache(),
})

app.page(
  definePage({
    path: '/ai-pages/:id',
    cache: {
      ttl: 5 * 60_000,
      staleTtl: 10 * 60_000,
      key: ({ params }) => \`page:ai:\${params.id}\`,
      hash: ({ page }) => page.updatedAt,
    },
    async load({ params }) {
      return { page: await loadAiPage(params.id) }
    },
    render({ data }) {
      return <AiPage data={data.page} />
    },
  }),
)`

const actionExample = `registerAction('ai.prompt.run', async ({ payload, el }) => {
  await fetch('/api/ai/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  el.textContent = '已提交'
})`

export function HomePage({
  title,
  tagline,
  metrics,
  advantages,
  apiGroups,
  packages,
  workflow,
}: HomePageProps) {
  return (
    <Layout title={title}>
      <main>
        <nav class="site-nav" aria-label="主导航">
          <a class="brand" href="/">
            <span class="brand-mark">PM</span>
            <span>PageMint</span>
          </a>
          <div class="nav-links">
            <a href="#overview">产品优势</a>
            <a href="#api">API 参考</a>
            <a href="#workflow">工作流</a>
            <a href="#packages">包结构</a>
            <a href="/movies/42">动态路由示例</a>
          </div>
          <a class="nav-cta" href="#start">
            快速开始
          </a>
        </nav>

        <section class="hero-shell">
          <div class="section hero">
            <div class="hero-copy">
              <p class="eyebrow">面向 AI 时代的全栈框架</p>
              <h1>{title}</h1>
              <p class="lead">{tagline}</p>
              <div class="actions">
                <a class="link-button primary-link" href="#api">
                  查看 API 参考
                </a>
                <Button action="demo.toast" payload={{ message: 'AI 页面可以先生成、再缓存、再后台重建。' }}>
                  体验轻交互
                </Button>
              </div>
              <div class="metric-row" aria-label="PageMint 关键指标">
                {metrics.map((metric) => (
                  <div class="metric">
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div class="product-visual" aria-label="PageMint 产品能力预览">
              <div class="visual-topbar">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
                <span>PageMint AI Page Pipeline</span>
              </div>
              <div class="pipeline">
                <div class="pipeline-card accent-teal">
                  <span>01</span>
                  <strong>Route</strong>
                  <p>匹配路径和查询参数</p>
                </div>
                <div class="pipeline-card accent-blue">
                  <span>02</span>
                  <strong>AI / Data</strong>
                  <p>加载模型输出与业务数据</p>
                </div>
                <div class="pipeline-card accent-amber">
                  <span>03</span>
                  <strong>Server JSX</strong>
                  <p>渲染完整 HTML</p>
                </div>
                <div class="pipeline-card accent-ink">
                  <span>04</span>
                  <strong>Cache</strong>
                  <p>缓存、失效、后台重建</p>
                </div>
              </div>
              <pre class="visual-code">
                <code>{quickstart}</code>
              </pre>
            </div>
          </div>
        </section>

        <section class="section band" id="start">
          <div class="section-heading">
            <p class="eyebrow">快速开始</p>
            <h2>从项目创建到可访问页面，只保留必要步骤。</h2>
            <p>
              PageMint 的默认路径是 Node.js + Hono + 服务端 JSX。你可以先用内存缓存跑通，
              再替换为文件缓存、Redis 或自定义缓存适配器。
            </p>
          </div>
          <div class="terminal wide-terminal" aria-label="快速开始命令">
            <div class="terminal-head">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
              安装命令
            </div>
            <pre>
              <code>{quickstart}</code>
            </pre>
          </div>
        </section>

        <section class="section" id="overview">
          <div class="section-heading">
            <p class="eyebrow">产品优势</p>
            <h2>为 AI 全栈应用优化，而不是把 SPA 框架重新包装一遍。</h2>
            <p>
              AI 应用常见的瓶颈不只是前端交互，而是模型调用成本、外部数据波动、首屏稳定性和部署复杂度。
              PageMint 把这些问题放在服务端页面层解决。
            </p>
          </div>
          <div class="grid cols-4">
            {advantages.map((advantage) => (
              <article class="feature-card">
                <h3>{advantage.title}</h3>
                <p>{advantage.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section class="section split" id="api">
          <div>
            <p class="eyebrow">核心代码</p>
            <h2>一个页面同时声明路由、数据、缓存和 HTML 输出。</h2>
            <p class="muted">
              API 设计围绕“页面是服务端产物”展开。AI/RAG/API 数据先在服务端收敛，再生成 HTML，
              最后通过缓存和后台重建保障访问稳定性。
            </p>
          </div>
          <div class="terminal" aria-label="definePage 示例">
            <div class="terminal-head">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
              app.tsx
            </div>
            <pre>
              <code>{pageExample}</code>
            </pre>
          </div>
        </section>

        <section class="section api-reference">
          <div class="section-heading">
            <p class="eyebrow">API 参考</p>
            <h2>覆盖框架、缓存、重建、轻交互和 CLI 的主要公开 API。</h2>
            <p>
              这里列出 PageMint 当前 SDK 对开发者开放的核心能力。每个 API 都围绕 AI 页面生成、
              HTML 缓存、可替换基础设施和轻量交互设计。
            </p>
          </div>
          <div class="api-group-list">
            {apiGroups.map((group) => (
              <section class="api-group">
                <div class="api-group-copy">
                  <h3>{group.title}</h3>
                  <p>{group.description}</p>
                </div>
                <div class="api-list">
                  {group.apis.map((api) => (
                    <article class="api-card">
                      <div class="api-card-head">
                        <strong>{api.name}</strong>
                        <code>{api.signature}</code>
                      </div>
                      <p>{api.description}</p>
                      <div class="api-benefit">{api.benefit}</div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section class="section band" id="workflow">
          <div class="section-heading">
            <p class="eyebrow">工作流</p>
            <h2>AI 内容从生成到上线，默认走可缓存、可回滚的路径。</h2>
            <p>
              当模型输出、外部 API 或知识库数据变化时，PageMint 可以对比数据指纹，必要时后台重建页面。
              如果重建失败，旧 HTML 会继续在线。
            </p>
          </div>
          <div class="flow" aria-label="PageMint 工作流">
            {workflow.map((step, index) => (
              <div class="step">
                <strong>
                  {index + 1}. {step.title}
                </strong>
                {step.description}
              </div>
            ))}
          </div>
        </section>

        <section class="section split" id="packages">
          <div>
            <p class="eyebrow">包结构</p>
            <h2>商业化 SDK 需要清晰边界，而不是把所有能力塞进一个黑盒。</h2>
            <p class="muted">
              PageMint 的核心不绑定数据库、Redis 或具体 AI 服务。缓存、运行时、CLI 和部署路径都通过独立包组织，
              方便团队逐步替换基础设施。
            </p>
          </div>
          <div class="card package-card">
            {packages.map((pkg) => (
              <div class="package">
                <div>
                  <strong>{pkg.name}</strong>
                  <span class="muted">{pkg.description}</span>
                </div>
                <span class="tag">{pkg.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section class="section split">
          <div>
            <p class="eyebrow">轻交互</p>
            <h2>不用 hydration，也能完成按钮、弹窗、请求提交等轻量动作。</h2>
            <p class="muted">
              `data-action` 是 PageMint 的最小浏览器协议。它不接管页面状态，只在需要交互的位置绑定动作。
            </p>
            <div class="fit-grid">
              <div class="card">
                <h3 class="good">适合</h3>
                <ul class="list">
                  <li>AI 内容站与文档站</li>
                  <li>RAG/知识库前台</li>
                  <li>媒体索引与聚合页</li>
                  <li>内部工具和运营后台</li>
                </ul>
              </div>
              <div class="card">
                <h3 class="bad">不作为优先目标</h3>
                <ul class="list">
                  <li>重客户端大型 SPA</li>
                  <li>类 Figma 编辑器</li>
                  <li>毫秒级实时协同编辑</li>
                  <li>主要依赖浏览器状态的产品</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="terminal" aria-label="data-action 示例">
            <div class="terminal-head">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
              actions.js
            </div>
            <pre>
              <code>{actionExample}</code>
            </pre>
          </div>
        </section>
      </main>
      <footer>
        <strong>PageMint</strong>
        <span>面向 AI 时代的服务端优先全栈框架，当前页面由 PageMint 服务端 JSX 渲染并通过路由 HTML 缓存返回。</span>
      </footer>
    </Layout>
  )
}
