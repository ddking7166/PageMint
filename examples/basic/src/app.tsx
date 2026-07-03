import { serve } from '@hono/node-server'
import { memoryCache } from '@pagemint/cache-memory'
import { createPageMintApp, definePage } from '@pagemint/hono'
import { readFile } from 'node:fs/promises'

import { HomePage } from './pages/home.js'
import { MovieDetailPage } from './pages/movie.js'

import type { Movie } from './pages/movie.js'

type MoviePageData = {
  movie: Movie & { updatedAt: string }
}

const app = createPageMintApp({
  cache: memoryCache(),
})

app.page(
  definePage({
    path: '/',
    cache: {
      ttl: 60_000,
      staleTtl: 5 * 60_000,
      key: ({ request }) => `page:${new URL(request.url).pathname}`,
    },
    async load() {
      return {
        title: 'PageMint：AI 时代的全栈框架',
        tagline:
          '把路由、服务端 JSX、AI 数据加载、HTML 缓存、后台重建和轻交互放进一套简单、稳定、可发布的全栈 SDK。',
        metrics: [
          {
            value: '0',
            label: '默认前端水合',
          },
          {
            value: '1',
            label: '路由一个 HTML 缓存键',
          },
          {
            value: '5 min',
            label: '外部数据检查示例',
          },
        ],
        advantages: [
          {
            title: 'AI 输出可缓存',
            description: '把模型结果、RAG 查询和外部 API 数据先收敛到服务端，再渲染成可复用的 HTML 页面。',
          },
          {
            title: '首屏稳定',
            description: '浏览器默认拿到完整 HTML，不需要等待客户端应用加载完成后才看到内容。',
          },
          {
            title: '成本可控',
            description: '新鲜缓存直接返回，过期缓存先兜底再重建，减少重复模型调用和外部接口压力。',
          },
          {
            title: '基础设施可替换',
            description: '核心只依赖 CacheStore 接口，Memory、File、Redis 或自定义存储都可以接入。',
          },
          {
            title: '交互轻量',
            description: '通过 data-action 处理按钮、弹窗、请求提交等局部交互，不把页面变成大型 SPA。',
          },
          {
            title: '发布友好',
            description: 'monorepo 包结构清晰，默认 Node.js 可运行，同时为 Bun、Deno、Workers 留出适配空间。',
          },
          {
            title: '故障兜底',
            description: '重新生成失败时不会删除旧页面，线上页面可以继续服务用户。',
          },
          {
            title: '类型优先',
            description: '页面数据、渲染上下文、缓存适配器和重建任务都有明确 TypeScript 类型。',
          },
        ],
        apiGroups: [
          {
            title: '应用与页面',
            description: '负责创建应用、声明页面、绑定 Hono 路由，是 PageMint 最常用的入口。',
            apis: [
              {
                name: 'createPageMintApp',
                signature: 'createPageMintApp(options)',
                description: '创建带 PageMint 能力的 Hono 应用，可传入 cache、now、onError 等选项。',
                benefit: '让业务项目直接获得页面注册、缓存、失效和重新验证能力。',
              },
              {
                name: 'definePage',
                signature: 'definePage<TData>(options)',
                description: '定义一个页面，包括 path、load、render 和 cache 配置。',
                benefit: '把路由、数据和 HTML 输出放在同一个强类型页面单元里。',
              },
              {
                name: 'app.page',
                signature: 'app.page(definePage(...))',
                description: '把 PageMint 页面注册为 Hono GET 路由。',
                benefit: '开发者写页面，框架负责请求处理、缓存读取和 HTML 响应。',
              },
            ],
          },
          {
            title: '页面上下文与渲染',
            description: '描述每次请求进入页面时可用的上下文，以及页面如何输出 HTML。',
            apis: [
              {
                name: 'PageContext',
                signature: '{ request, params, query, pathname }',
                description: '页面 load、cache.key 等函数共享的请求上下文。',
                benefit: 'AI 页面可以基于路径、查询参数和请求信息加载数据。',
              },
              {
                name: 'PageRenderContext',
                signature: 'PageContext & { data }',
                description: 'render 阶段拿到的上下文，比 PageContext 多了 load 返回的数据。',
                benefit: '保证数据加载和 JSX 渲染之间类型一致。',
              },
              {
                name: 'renderToHtml',
                signature: 'renderToHtml(result)',
                description: '把 Hono JSX 或 HTML 字符串渲染为最终 HTML。',
                benefit: '服务端输出完整 HTML，适合缓存和传统部署。',
              },
            ],
          },
          {
            title: '缓存与失效',
            description: '围绕 route HTML cache 提供读取、写入、失效和手动重建。',
            apis: [
              {
                name: 'PageCacheOptions',
                signature: '{ ttl, staleTtl, key, hash, revalidate }',
                description: '页面级缓存配置，控制新鲜期、可陈旧期、自定义缓存键和数据指纹。',
                benefit: '让 AI 页面既能省成本，又能在数据变化时安全刷新。',
              },
              {
                name: 'app.revalidate',
                signature: 'app.revalidate(path)',
                description: '按路径重新生成对应页面缓存。',
                benefit: '适合后台任务、Webhook 或运营后台触发页面刷新。',
              },
              {
                name: 'app.revalidateByKey',
                signature: 'app.revalidateByKey(key)',
                description: '按缓存键重新生成页面缓存。',
                benefit: '适合外部数据系统已经知道缓存键的场景。',
              },
              {
                name: 'app.invalidate',
                signature: 'app.invalidate(path)',
                description: '按路径删除缓存。',
                benefit: '下一次请求会同步重新生成 HTML。',
              },
              {
                name: 'app.invalidateByKey',
                signature: 'app.invalidateByKey(key)',
                description: '按缓存键删除缓存。',
                benefit: '适合精确失效某个 AI 内容页或详情页。',
              },
            ],
          },
          {
            title: '后台重新验证',
            description: '把外部数据检查、数据指纹对比和 HTML 重建交给后台任务。',
            apis: [
              {
                name: 'app.revalidator.register',
                signature: 'register({ name, interval, check, rebuild })',
                description: '注册周期性检查任务，检查外部数据是否变化，并在需要时重建 HTML。',
                benefit: '让 AI 内容站可以定时同步知识库、API 或模型生成结果。',
              },
              {
                name: 'app.revalidator.start',
                signature: 'start()',
                description: '启动已注册的周期任务。',
                benefit: '部署后自动保持页面缓存更新。',
              },
              {
                name: 'app.revalidator.stop',
                signature: 'stop()',
                description: '停止周期任务。',
                benefit: '方便测试、维护窗口或手动控制后台任务。',
              },
              {
                name: 'app.revalidator.run',
                signature: 'run(name?)',
                description: '手动执行全部任务或指定任务。',
                benefit: '适合发布后立即刷新内容，或接入管理后台按钮。',
              },
              {
                name: 'app.revalidator.list',
                signature: 'list()',
                description: '返回当前注册的任务名称。',
                benefit: '方便调试和运维展示。',
              },
            ],
          },
          {
            title: '缓存适配器',
            description: '通过统一 CacheStore 接口接入不同存储，核心包不绑定数据库或 Redis。',
            apis: [
              {
                name: 'CacheStore',
                signature: '{ get, set, delete, has? }',
                description: '缓存适配器接口，存储 CacheEntry。',
                benefit: '团队可以用内存、文件、Redis、对象存储或自研服务承载 HTML 缓存。',
              },
              {
                name: 'memoryCache',
                signature: 'memoryCache(initialEntries?)',
                description: '内存缓存实现，适合开发、测试和本地演示。',
                benefit: '零配置跑通 PageMint 的完整缓存流程。',
              },
              {
                name: 'fileCache',
                signature: 'fileCache({ dir })',
                description: '文件缓存实现，把 HTML 和 meta 写入本地目录。',
                benefit: '适合轻量部署和单机服务。',
              },
              {
                name: 'redisCache',
                signature: 'redisCache(client, { prefix? })',
                description: 'Redis-like 适配器，不把核心包绑定到具体 Redis 客户端。',
                benefit: '生产环境可以接入现有 Redis 基础设施。',
              },
              {
                name: 'createMemoryCache',
                signature: 'createMemoryCache(...)',
                description: 'memoryCache 的别名导出。',
                benefit: '兼容不同团队对工厂函数命名的偏好。',
              },
              {
                name: 'createFileCache',
                signature: 'createFileCache(...)',
                description: 'fileCache 的别名导出。',
                benefit: '让缓存工厂命名保持一致。',
              },
              {
                name: 'createRedisCache',
                signature: 'createRedisCache(...)',
                description: 'redisCache 的别名导出。',
                benefit: '让 Redis-like 适配器的使用方式更直观。',
              },
            ],
          },
          {
            title: '轻交互 runtime',
            description: '用 data-action 做局部交互，不引入 React hydration。',
            apis: [
              {
                name: 'ActionButton',
                signature: '<ActionButton action payload>',
                description: '服务端 JSX 组件，输出带 data-action 和 data-payload 的 button。',
                benefit: '页面仍是 HTML，交互只在需要的位置出现。',
              },
              {
                name: 'registerAction',
                signature: 'registerAction(name, handler)',
                description: '在浏览器注册 data-action 处理函数。',
                benefit: '适合弹窗、收藏、提交请求、局部更新等轻动作。',
              },
              {
                name: 'unregisterAction',
                signature: 'unregisterAction(name)',
                description: '注销指定动作。',
                benefit: '方便动态页面或测试环境清理动作。',
              },
              {
                name: 'dispatchAction',
                signature: 'dispatchAction(ctx)',
                description: '手动触发已注册动作。',
                benefit: '适合高级场景或自定义事件桥接。',
              },
              {
                name: 'installActionRuntime',
                signature: 'installActionRuntime(options?)',
                description: '安装点击监听器，自动分发 data-action。',
                benefit: '用很小的浏览器运行时代替整页 hydration。',
              },
              {
                name: 'getAction',
                signature: 'getAction(name)',
                description: '读取已注册动作。',
                benefit: '方便调试动作注册状态，或在高级场景中组合动作。',
              },
              {
                name: 'listActions',
                signature: 'listActions()',
                description: '列出当前浏览器 runtime 中注册的动作。',
                benefit: '适合调试、测试和可视化动作面板。',
              },
              {
                name: 'clearActions',
                signature: 'clearActions()',
                description: '清空所有已注册动作。',
                benefit: '适合测试隔离、页面卸载或重新初始化 runtime。',
              },
            ],
          },
          {
            title: '工具与 CLI',
            description: '提供脚手架和底层工具，便于 SDK 发布和项目创建。',
            apis: [
              {
                name: 'create-pagemint',
                signature: 'npx create-pagemint my-app',
                description: '生成一个可运行的 PageMint 项目。',
                benefit: '降低从 SDK 到真实项目的启动成本。',
              },
              {
                name: 'createDataHash',
                signature: 'createDataHash(data)',
                description: '为数据生成稳定指纹。',
                benefit: '当 AI/API 数据没有变化时，可以刷新缓存时间而跳过 HTML 重建。',
              },
              {
                name: 'stableStringify',
                signature: 'stableStringify(value)',
                description: '稳定序列化对象，用于数据指纹计算。',
                benefit: '让相同数据结构得到稳定结果，减少误判刷新。',
              },
              {
                name: 'pagemintPoweredBy',
                signature: 'pagemintPoweredBy(value?)',
                description: 'Hono middleware，为响应写入 x-powered-by。',
                benefit: '适合示例、内部诊断和框架品牌识别。',
              },
              {
                name: 'PageMintError',
                signature: 'new PageMintError(message, context, cause?)',
                description: '带阶段和上下文信息的框架错误类型。',
                benefit: '线上排错时能定位 load、render、cache 或 revalidate 阶段。',
              },
            ],
          },
          {
            title: '路由与上下文工具',
            description: '底层 helper 让高级用户可以复用 PageMint 的路由、上下文和缓存键逻辑。',
            apis: [
              {
                name: 'createPageContext',
                signature: 'createPageContext(request, params?)',
                description: '从 Request 和 params 生成 PageContext。',
                benefit: '适合测试、手动渲染和自定义适配器。',
              },
              {
                name: 'clonePageContext',
                signature: 'clonePageContext(ctx)',
                description: '复制页面上下文。',
                benefit: '后台重建时保存请求上下文，避免引用被意外修改。',
              },
              {
                name: 'createSyntheticRequest',
                signature: 'createSyntheticRequest(pathOrUrl)',
                description: '用路径或 URL 创建 Request。',
                benefit: '让手动 revalidate 可以从路径恢复请求上下文。',
              },
              {
                name: 'defaultCacheKey',
                signature: 'defaultCacheKey(ctx)',
                description: '根据 pathname 和排序后的 query 生成默认缓存键。',
                benefit: '不写自定义 key 也能获得稳定缓存。',
              },
              {
                name: 'normalizeQuery',
                signature: 'normalizeQuery(query)',
                description: '把 URLSearchParams 排序后序列化。',
                benefit: '避免 query 参数顺序不同导致缓存键不稳定。',
              },
              {
                name: 'resolveCacheKey',
                signature: 'resolveCacheKey(page, ctx)',
                description: '优先使用页面自定义 key，否则使用默认缓存键。',
                benefit: '适合测试页面缓存策略或自定义运行时。',
              },
              {
                name: 'matchPath',
                signature: 'matchPath(pattern, pathname)',
                description: '匹配静态路由和 :param 动态路由。',
                benefit: '可在非 Hono 环境复用 PageMint 的基础路由匹配。',
              },
              {
                name: 'findMatchingPage',
                signature: 'findMatchingPage(pages, pathname)',
                description: '在已注册页面中查找匹配项。',
                benefit: '适合自定义 adapter 或测试路由注册结果。',
              },
            ],
          },
          {
            title: '缓存状态工具',
            description: '底层 helper 让高级用户可以检查、创建和刷新 CacheEntry。',
            apis: [
              {
                name: 'createCacheEntry',
                signature: 'createCacheEntry(input)',
                description: '根据 HTML、hash、TTL 和 headers 创建缓存条目。',
                benefit: '适合自定义构建器或外部任务直接写入缓存。',
              },
              {
                name: 'refreshCacheEntry',
                signature: 'refreshCacheEntry(entry, cache, now)',
                description: '在数据未变化时刷新缓存时间。',
                benefit: '减少无意义 HTML 重建。',
              },
              {
                name: 'cloneCacheEntry',
                signature: 'cloneCacheEntry(entry)',
                description: '复制缓存条目。',
                benefit: '避免调用方修改缓存内部状态。',
              },
              {
                name: 'isFresh',
                signature: 'isFresh(entry, now)',
                description: '判断缓存是否仍在新鲜期。',
                benefit: '支持自定义缓存策略测试。',
              },
              {
                name: 'canServeStale',
                signature: 'canServeStale(entry, now)',
                description: '判断缓存是否还能作为陈旧内容返回。',
                benefit: '支持 stale-while-revalidate 场景。',
              },
            ],
          },
          {
            title: '底层类与类型接口',
            description: '这些类和类型用于高级集成、适配器开发和 TypeScript 类型约束。',
            apis: [
              {
                name: 'PageMintEngine',
                signature: 'new PageMintEngine(options)',
                description: 'PageMint 核心引擎类。',
                benefit: '适合不通过 Hono 也想复用页面缓存和重建能力的高级场景。',
              },
              {
                name: 'PageMintRevalidator',
                signature: 'new PageMintRevalidator(options)',
                description: '外部数据检查和后台重建任务管理器。',
                benefit: '适合自定义运行时独立调度重建任务。',
              },
              {
                name: 'DefinePageOptions',
                signature: 'DefinePageOptions<TData>',
                description: 'definePage 的页面配置类型。',
                benefit: '让页面配置在 SDK 和业务项目之间保持强类型。',
              },
              {
                name: 'PageMintAppOptions',
                signature: 'PageMintAppOptions',
                description: '创建应用或引擎时的配置类型。',
                benefit: '定义 cache、now、onError 等框架级选项。',
              },
              {
                name: 'CacheEntry',
                signature: 'CacheEntry',
                description: 'HTML 缓存条目类型。',
                benefit: '规范 html、dataHash、createdAt、updatedAt、staleAt、expireAt 等字段。',
              },
              {
                name: 'PageResponse',
                signature: 'PageResponse',
                description: '页面处理结果类型。',
                benefit: '用于自定义 adapter 把 HTML、headers、cacheStatus 转成响应。',
              },
              {
                name: 'RevalidatorTask',
                signature: 'RevalidatorTask<TData>',
                description: '后台检查任务类型。',
                benefit: '规范 check 和 rebuild 的输入输出。',
              },
              {
                name: 'ActionContext',
                signature: 'ActionContext<TPayload>',
                description: '浏览器动作处理函数上下文。',
                benefit: '让 payload、元素和原始事件都有明确类型。',
              },
              {
                name: 'ActionHandler',
                signature: 'ActionHandler<TPayload>',
                description: 'data-action 处理函数类型。',
                benefit: '支持同步或异步浏览器动作。',
              },
              {
                name: 'ActionRuntimeOptions',
                signature: 'ActionRuntimeOptions',
                description: '安装 action runtime 时的配置类型。',
                benefit: '控制监听根节点和默认 preventDefault 行为。',
              },
            ],
          },
          {
            title: '类型导出索引',
            description: '商业化 SDK 需要稳定类型面，这些类型用于页面、适配器、响应和运行时扩展。',
            apis: [
              {
                name: 'PageCacheOptions',
                signature: 'PageCacheOptions<TData>',
                description: '页面缓存策略类型。',
                benefit: '约束 ttl、staleTtl、key、hash 和 revalidate。',
              },
              {
                name: 'PageContext',
                signature: 'PageContext',
                description: '页面请求上下文类型。',
                benefit: '统一 request、params、query、pathname。',
              },
              {
                name: 'PageRenderContext',
                signature: 'PageRenderContext<TData>',
                description: '页面渲染上下文类型。',
                benefit: '在 PageContext 基础上携带 data。',
              },
              {
                name: 'PageRenderResult',
                signature: 'PageRenderResult',
                description: 'render 函数返回值类型。',
                benefit: '约束 JSX 或 HTML 字符串输出。',
              },
              {
                name: 'PageCacheStatus',
                signature: 'PageCacheStatus',
                description: '缓存状态枚举类型。',
                benefit: '表达 bypass、hit、miss、stale、revalidated。',
              },
              {
                name: 'PageMintErrorContext',
                signature: 'PageMintErrorContext',
                description: '错误上下文类型。',
                benefit: '标记错误发生的 phase、cacheKey、pathname 和 pagePath。',
              },
              {
                name: 'RegisteredPage',
                signature: 'RegisteredPage<TData>',
                description: '已注册页面类型。',
                benefit: '用于引擎内部或高级测试场景。',
              },
              {
                name: 'RevalidateCheckResult',
                signature: 'RevalidateCheckResult<TData>',
                description: '外部数据检查返回类型。',
                benefit: '规范 key、hash、data、ttl、staleTtl 和 headers。',
              },
              {
                name: 'RevalidateRebuildContext',
                signature: 'RevalidateRebuildContext<TData>',
                description: '后台 rebuild 函数上下文类型。',
                benefit: '提供 key、data、hash 和 previousEntry。',
              },
              {
                name: 'Revalidator',
                signature: 'Revalidator',
                description: '重新验证器接口。',
                benefit: '统一 register、start、stop、run、list 等能力。',
              },
              {
                name: 'RegisteredAction',
                signature: 'RegisteredAction',
                description: '已注册浏览器动作类型。',
                benefit: '用于动作列表展示和调试。',
              },
              {
                name: 'CreatePageMintAppOptions',
                signature: 'CreatePageMintAppOptions',
                description: 'Hono app 创建选项类型。',
                benefit: '给 @pagemint/hono 的应用入口提供类型约束。',
              },
              {
                name: 'PageMintHonoApp',
                signature: 'PageMintHonoApp',
                description: '增强后的 Hono 应用类型。',
                benefit: '包含 page、revalidate、invalidate、revalidator 和 engine。',
              },
            ],
          },
        ],
        packages: [
          {
            name: '@pagemint/core',
            label: '内核',
            description: '页面渲染、缓存生命周期、构建锁、数据指纹对比和重新验证。',
          },
          {
            name: '@pagemint/hono',
            label: '适配器',
            description: '基于 Hono 提供 app.page()、invalidate() 和 revalidate()。',
          },
          {
            name: '@pagemint/cache-memory',
            label: '缓存',
            description: '用于开发、测试和轻量部署的内存 CacheStore。',
          },
          {
            name: '@pagemint/actions',
            label: '交互',
            description: '用极小的轻交互协议处理页面上的浏览器事件。',
          },
          {
            name: 'create-pagemint',
            label: '脚手架',
            description: '生成可运行项目，包含页面、组件、静态动作脚本和开发命令。',
          },
        ],
        workflow: [
          {
            title: '请求进入 Hono',
            description: 'PageMint 匹配页面路由，生成请求上下文。',
          },
          {
            title: '读取 HTML 缓存',
            description: '命中且新鲜时直接返回完整 HTML。',
          },
          {
            title: '加载 AI/业务数据',
            description: '未命中或过期时执行 load，拉取模型、RAG 或外部 API 数据。',
          },
          {
            title: '渲染服务端 JSX',
            description: '把数据填入 JSX，生成可缓存的完整 HTML 字符串。',
          },
          {
            title: '对比数据指纹',
            description: '数据没变时跳过重建，数据变化时原子替换缓存。',
          },
          {
            title: '失败继续兜底',
            description: '重新生成失败时保留旧 HTML，不让线上页面中断。',
          },
        ],
      }
    },
    render({ data }) {
      return (
        <HomePage
          title={data.title}
          tagline={data.tagline}
          metrics={data.metrics}
          advantages={data.advantages}
          apiGroups={data.apiGroups}
          packages={data.packages}
          workflow={data.workflow}
        />
      )
    },
  }),
)

app.page(
  definePage<MoviePageData>({
    path: '/movies/:id',
    cache: {
      ttl: 5 * 60_000,
      staleTtl: 10 * 60_000,
      key: ({ params }) => `page:movie:${params.id}`,
      hash: ({ movie }) => `${movie.id}:${movie.updatedAt}`,
    },
    async load({ params }) {
      const movie = await fetchMovie(params.id)
      return { movie }
    },
    render({ data }) {
      return <MovieDetailPage movie={data.movie} />
    },
  }),
)

app.get('/static/actions.js', async (c) => {
  const actions = await readStaticFile('actions.js')
  return c.text(actions, 200, {
    'content-type': 'text/javascript; charset=UTF-8',
  })
})

app.revalidator.register<MoviePageData>({
  name: 'movie:42',
  interval: 5 * 60_000,
  async check() {
    const movie = await fetchMovie('42')
    return {
      key: 'page:movie:42',
      hash: `${movie.id}:${movie.updatedAt}`,
      data: { movie },
      ttl: 5 * 60_000,
      staleTtl: 10 * 60_000,
    }
  },
  rebuild({ data }) {
    if (!data) {
      throw new Error('缺少页面数据')
    }
    return <MovieDetailPage movie={data.movie} />
  },
})
app.revalidator.start()

const port = Number(process.env.PORT ?? 3000)
serve({ fetch: app.fetch, port })
console.log(`PageMint 示例已启动：http://localhost:${port}`)

export default app

async function fetchMovie(id: string): Promise<Movie & { updatedAt: string }> {
  return {
    id,
    title: id === '42' ? 'AI 内容页示例' : `内容页 ${id}`,
    year: 2026,
    summary: '这是一个通过动态路由加载、服务端 JSX 渲染、并按路由键缓存的 PageMint 示例页面。',
    updatedAt: 'v1',
  }
}

async function readStaticFile(file: string): Promise<string> {
  const candidates = [
    new URL(`./static/${file}`, import.meta.url),
    new URL(`../src/static/${file}`, import.meta.url),
  ]

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, 'utf8')
    } catch {
      // 继续尝试开发态或构建态路径。
    }
  }

  throw new Error(`无法读取静态文件：${file}`)
}
