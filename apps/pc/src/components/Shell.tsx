import { ClientScripts } from '@pagemint/hono'

import { pcClientManifest, pcClientStyles } from '../client/manifest.js'
import { asArray, text } from '../lib/records.js'
import { loadAppConfig } from '../config/app-config.js'
import { movieDetailUrl } from '../lib/url.js'

import type { Child } from 'hono/jsx'
import type { AnyRecord } from '../lib/records.js'

export interface PcShellProps {
  title: string
  systemInfo: AnyRecord
  children: Child
  headerOverlay?: boolean
  currentLabel?: string
}

export function PcShell({
  title,
  systemInfo,
  children,
  headerOverlay = false,
  currentLabel = '首页',
}: PcShellProps) {
  const siteName = text(systemInfo.site_name, '凡客影视')
  const appConfig = loadAppConfig()
  const { fanke } = appConfig.thirdParty

  return (
    <html lang="zh-CN" class="h-full antialiased">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000" />
        <title>{title}</title>
        <link rel="stylesheet" href="/assets/iconfont/iconfont.css" />
        {pcClientStyles().map((href) => (
          <link rel="stylesheet" href={href} />
        ))}
        <ClientScripts
          manifest={pcClientManifest}
          modules={appConfig.client.modules}
          scripts={appConfig.client.scripts}
        />
      </head>
      <body
        class="min-h-full bg-color-bg font-sans text-white"
        data-base-domain=""
        data-api-key={fanke.publicApiKey}
        data-bnc-image-key={fanke.publicBncImageKey}
      >
        <SiteHeader
          systemInfo={systemInfo}
          currentLabel={currentLabel}
          overlay={headerOverlay}
        />
        {children}
        <SiteFooter systemInfo={systemInfo} />
      </body>
    </html>
  )
}

function SiteHeader({
  systemInfo,
  currentLabel,
  overlay,
}: {
  systemInfo: AnyRecord
  currentLabel: string
  overlay?: boolean
}) {
  const categories = asArray(systemInfo.categories)
  const mainMenus = asArray(systemInfo.main_menus)
  const hotItems = asArray(systemInfo.movie_hot_items).slice(0, 5)
  const navItems: AnyRecord[] = mainMenus.length > 0 ? mainMenus : [
    { name: '首页', url: '/' },
    ...categories.slice(0, 8).map((item) => ({
      name: item.name,
      url: item.url || `/channel/${item.value ?? item.id ?? ''}`,
    })),
  ]

  return (
    <header id="site-header" class={`site-header ${overlay ? 'site-header-overlay' : 'site-header-solid'}`}>
      <div class="site-header-inner">
        <a href="/" class="site-logo" aria-label={text(systemInfo.site_name, '首页')}>
          <img src="/assets/img/logo.png" alt={text(systemInfo.site_name, '凡客影视')} />
        </a>
        <nav class="site-nav" aria-label="主导航">
          <button class="site-nav-current" type="button">
            <span>{currentLabel}</span>
            <i class="iconfont icon-arrow-down" aria-hidden="true" />
          </button>
          <div class="site-nav-menu">
            <a class={currentLabel === '首页' ? 'active' : ''} href="/">首页</a>
            {navItems.map((item) => (
              <a href={text(item.url, '/channel')}>{text(item.name ?? item.title, '频道')}</a>
            ))}
            <a href="/channel">片库</a>
            <a href="/movie/rank">排行榜</a>
          </div>
        </nav>

        <div class="site-search-wrap">
          <form class="site-search" action="/channel" method="get" data-search-form>
            <input
              id="search-input"
              name="keywords"
              type="text"
              placeholder="搜索电影、电视剧、综艺、动漫、短剧"
              maxLength={40}
              autoComplete="off"
              data-search-input
            />
            <button type="submit" aria-label="搜索">
              <i class="iconfont icon-search" aria-hidden="true" />
            </button>
            <div class="search-popup hidden" data-search-popup>
              <div class="smart-res-wrap hidden" data-smart-results />
              <div class="history-hot-wrap" data-history-hot>
                <div class="history-keywords-wrap hidden" data-search-history>
                  <div class="search-popup-title">
                    <span>历史搜索</span>
                    <button type="button" data-search-clear>清除</button>
                  </div>
                  <div class="search-chip-list" data-search-history-list />
                </div>
                <div class="hot-wrap">
                  <div class="search-popup-title">热门搜索</div>
                  {hotItems.map((item, index) => (
                    <a href={movieDetailUrl(item)} title={text(item.movie_name ?? item.name)} class="hot-search-item">
                      <i class={`iconfont icon-number-${index + 1}`} aria-hidden="true" />
                      {text(item.movie_name ?? item.name)}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </form>
        </div>

        <div class="site-actions">
          <div class="header-history" data-header-history>
            <a class="site-action history-action" href="/user/history" title="观看历史" data-history-trigger>
              <img src="/assets/img/icon-history.png" alt="" />
            </a>
            <div class="header-history-dropdown" data-history-dropdown>
              <div class="header-card">
                <div class="header-card-title">
                  <span>我的观看记录</span>
                  <button type="button" data-history-clear>清除</button>
                </div>
                <div class="header-history-list" data-history-list>
                  <div class="header-empty">加载中...</div>
                </div>
              </div>
            </div>
          </div>
          <div class="header-user" data-header-user>
            <a class="site-user-avatar" href="/user" title="用户中心">
              <img src="/h5/images/placeholder/placeholder1.png" alt="" data-header-avatar />
            </a>
            <div class="header-user-dropdown">
              <div class="header-card">
                <a href="/user" class="header-user-summary">
                  <img src="/h5/images/placeholder/placeholder1.png" alt="" data-header-avatar-large />
                  <div>
                    <strong data-header-name>游客</strong>
                    <span>编号:<b data-header-number>游客</b></span>
                  </div>
                </a>
                <div class="header-user-actions">
                  <a href="/user">个人中心 <span>›</span></a>
                  <button type="button" data-switch-account>切换账号</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

function SiteFooter({ systemInfo }: { systemInfo: AnyRecord }) {
  return (
    <footer class="site-footer">
      <div>版权声明：如果来函说明本网站提供内容本人或法人版权所有,本网站在核实后，有权先行撤除，以保护版权拥有者的权益</div>
      <div class="site-footer-links">
        <span>Email：{text(systemInfo.service_email)}</span>
        <a href="/sitemap.xml">站点地图</a>
        <a href="/rss.xml">rss订阅</a>
      </div>
      <div>Copyright 2021-2026 {text(systemInfo.main_url)} All rights Reserved.</div>
      <button type="button" class="back-to-top" data-back-to-top aria-label="返回顶部">
        <span class="iconfont icon-arrow-up" aria-hidden="true" />
      </button>
    </footer>
  )
}

export function EmptyState({ keywords, text: fallbackText }: { keywords?: string; text?: string }) {
  return (
    <div class="empty-state">
      <img src="/h5/images/empty.png" alt="" />
      <div>
        {fallbackText ?? (
          <>
            暂无
            {keywords ? <span title={keywords}>{keywords}</span> : null}
            相关内容
          </>
        )}
      </div>
    </div>
  )
}
