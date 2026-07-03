import { ClientScripts } from '@pagemint/hono'

import { pcClientManifest, pcClientStyles } from '../client/manifest.js'
import { asArray, text } from '../lib/records.js'
import { loadAppConfig } from '../config/app-config.js'

import type { AnyRecord } from '../lib/records.js'

function formatDate() {
  const now = new Date()
  const year = String(now.getFullYear()).slice(-2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}

function normalizeUrl(value: string, prefix = 'https://') {
  if (!value) return ''
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) || value.startsWith('mailto:')) return value
  return `${prefix}${value.replace(/^\/+/, '')}`
}

function PdfLink({ href, children, className = '' }: { href: string; children: string; className?: string }) {
  if (!href) return null
  return <a href={href} target="_blank" rel="noopener noreferrer" class={className}>{children}</a>
}

export function PdfPage({ systemInfo }: { systemInfo: AnyRecord }) {
  const webDomains = asArray<string>(systemInfo.web_domains)
  const privateDomains = asArray<string>(systemInfo.private_domains)
  const siteName = text(systemInfo.site_name, '凡客影视')
  const serviceLink = normalizeUrl(text(systemInfo.service_link))
  const serviceEmail = text(systemInfo.service_email)
  const siteUrl = normalizeUrl(text(systemInfo.site_url ?? systemInfo.main_url))
  const appConfig = loadAppConfig()
  const { fanke } = appConfig.thirdParty

  return (
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{siteName}-最新线路</title>
        {pcClientStyles().map((href) => (
          <link rel="stylesheet" href={href} />
        ))}
        <ClientScripts
          manifest={pcClientManifest}
          modules={appConfig.client.modules}
          scripts={appConfig.client.scripts}
        />
      </head>
      <body data-api-key={fanke.publicApiKey} data-bnc-image-key={fanke.publicBncImageKey}>
        <main class="pdf-page">
          <section class="pdf-sheet">
            <div class="pdf-header">
              <img src="/assets/img/back-home-text1.png" alt="" />
              <div>
                <div>PDF更新时间 <span>{formatDate()}</span></div>
                <strong>点击链接可直接跳转访问</strong>
              </div>
            </div>

            <section class="pdf-columns">
              <div>
                <img src="/assets/img/back-home-text2.png" alt="最新网址" />
                <div class="pdf-link-stack">
                  {webDomains.length ? webDomains.map((domain) => {
                    const href = normalizeUrl(domain)
                    return (
                      <div>
                        <div>{siteName}最新网址</div>
                        <PdfLink href={href} className="pdf-glow-pink">{href}</PdfLink>
                      </div>
                    )
                  }) : <div class="pdf-muted">暂无可用域名</div>}
                </div>
              </div>
              <div>
                <img src="/assets/img/back-home-text3.png" alt="官方联系" />
                <div class="pdf-link-stack">
                  <div>
                    <div>{siteName}官方频道(Telegram)</div>
                    <PdfLink href={serviceLink} className="pdf-glow-purple">{serviceLink}</PdfLink>
                  </div>
                  <div>
                    <div>{siteName}官方客服(Telegram)</div>
                    <PdfLink href={serviceLink} className="pdf-glow-purple">{serviceLink}</PdfLink>
                  </div>
                  <div>
                    <div>{siteName}官方邮箱</div>
                    {serviceEmail ? <a href={`mailto:${serviceEmail}`} class="pdf-glow-purple">{serviceEmail}</a> : null}
                  </div>
                </div>
              </div>
            </section>

            <section class="pdf-more">
              <img src="/assets/img/back-home-text4.png" alt="更多地址" />
              <div class="pdf-two">
                <div>
                  <div>发送任意邮件可获取最新地址：</div>
                  {serviceEmail ? <a href={`mailto:${serviceEmail}`} class="pdf-glow-gold">{serviceEmail}</a> : null}
                </div>
                <div>
                  <div>{siteName}官方网址(可能需翻墙)：</div>
                  <PdfLink href={siteUrl} className="pdf-glow-gold">{siteUrl}</PdfLink>
                </div>
              </div>
              <div class="pdf-private">
                <div>{siteName}官方地址发布页(可能需翻墙)：</div>
                <div>
                  {privateDomains.length ? privateDomains.map((domain) => {
                    const href = normalizeUrl(domain)
                    return <PdfLink href={href} className="pdf-glow-gold">{href}</PdfLink>
                  }) : <span class="pdf-muted">暂无地址发布页</span>}
                </div>
              </div>
            </section>
          </section>
        </main>
      </body>
    </html>
  )
}
