import { Pager } from '../components/Pager.js'
import { PcShell } from '../components/Shell.js'
import { asArray, text } from '../lib/records.js'
import { IMAGE_PLACEHOLDER, mediaUrl } from '../lib/url.js'

import type { AnyRecord } from '../lib/records.js'

const typeOptions = [
  { value: '', label: '全部' },
  { value: '1', label: '足球' },
  { value: '18', label: '篮球' },
  { value: '151', label: '电竞' },
]

function statusText(status?: string) {
  if (status === '1') return '直播中'
  if (status === '2') return '已结束'
  return '未开始'
}

function statusClass(status?: string) {
  if (status === '1') return 'live-status live-on'
  if (status === '2') return 'live-status live-end'
  return 'live-status live-wait'
}

function matchTitle(match?: AnyRecord | null) {
  if (!match) return '直播'
  return [match.home, match.away].filter(Boolean).join(' vs ') || text(match.league_name, '直播')
}

function playableLines(match?: AnyRecord | null): AnyRecord[] {
  return asArray(match?.live_list).filter((line) => line.is_played === '1' && line.app_name && line.stream_name)
}

function firstLine(match?: AnyRecord | null): AnyRecord | null {
  return playableLines(match)[0] || asArray(match?.live_list)[0] || null
}

function buildHref(query: AnyRecord, next: AnyRecord): string {
  const params = new URLSearchParams()
  const merged = {
    type: query.type || '',
    page: query.page || '',
    match: query.match || '',
    ...next,
  }
  Object.entries(merged).forEach(([key, value]) => {
    if (key === 'page' && (!value || value === '1')) return
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  const search = params.toString()
  return search ? `/live?${search}` : '/live'
}

function MatchLogo({ src, name }: { src?: string; name?: string }) {
  return (
    <div class="match-logo">
      {src ? <img src={mediaUrl(src)} alt={name || ''} loading="lazy" data-fallback-src={IMAGE_PLACEHOLDER.horizontal} /> : <span class="iconfont icon-live" />}
    </div>
  )
}

export function LivePage({
  systemInfo,
  result,
  query,
}: {
  systemInfo: AnyRecord
  result: AnyRecord
  query: AnyRecord
}) {
  const matches = asArray(result.items)
  const activeId = query.match && matches.some((match) => match.id === query.match) ? query.match : text(matches[0]?.id)
  const activeMatch = matches.find((match) => text(match.id) === activeId) || matches[0] || null
  const lines = asArray(activeMatch?.live_list)
  const selectedLine = firstLine(activeMatch)
  const total = Number(result.count || matches.length || 0)
  const pageSize = Number(result.pageSize || result.page_size || query.page_size || 60)
  const currentPage = Number(result.page || query.page || 1)

  return (
    <PcShell title={`${text(systemInfo.site_name, '凡客影视')} - 体育直播`} systemInfo={systemInfo} currentLabel="直播">
      <main class="live-page main-wrap" data-live-page>
        <section class="live-page-head">
          <div>
            <h1>体育直播</h1>
            <p>共 {total} 场赛事</p>
          </div>
          <nav class="live-type-filter">
            {typeOptions.map((option) => (
              <a href={buildHref(query, { type: option.value, page: undefined, match: undefined })} class={text(query.type) === option.value ? 'active' : ''}>
                {option.label}
              </a>
            ))}
          </nav>
        </section>

        <section class="live-layout">
          <div class="live-main">
            <div class="live-player" data-live-player data-match-title={matchTitle(activeMatch)} data-initial-line={selectedLine ? JSON.stringify({
              app_name: selectedLine.app_name,
              stream_name: selectedLine.stream_name,
              playable: selectedLine.is_played === '1' && activeMatch?.status === '1',
            }) : ''}>
              <video controls playsInline preload="metadata" data-live-video />
              <div class="live-player-mask" data-live-mask>
                <span class="iconfont icon-live" />
                <strong>{matchTitle(activeMatch)}</strong>
                <p>{!activeMatch ? '暂无直播赛事' : activeMatch.status !== '1' ? statusText(activeMatch.status) : '正在连接直播线路'}</p>
              </div>
            </div>

            <section class="live-info-panel">
              <div class="live-info-head">
                <div>
                  <h2>{matchTitle(activeMatch)}</h2>
                  <p>
                    {text(activeMatch?.league_name)}
                    {text(activeMatch?.date) ? <span>{text(activeMatch?.date)}</span> : null}
                    {text(activeMatch?.progress) ? <span>{text(activeMatch?.progress)}</span> : null}
                  </p>
                </div>
                {activeMatch ? <span class={statusClass(activeMatch.status)}>{statusText(activeMatch.status)}</span> : null}
              </div>
              <div class="live-line-list">
                {lines.length ? lines.map((line, index) => {
                  const playable = line.is_played === '1' && line.app_name && line.stream_name && activeMatch?.status === '1'
                  return (
                    <button
                      type="button"
                      class={line === selectedLine ? 'active' : ''}
                      disabled={!playable}
                      data-live-line={JSON.stringify({ app_name: line.app_name, stream_name: line.stream_name, playable })}
                    >
                      <span class="iconfont icon-play" />
                      <span>{text(line.name, `线路${index + 1}`)}</span>
                    </button>
                  )
                }) : <span class="live-muted">暂无线路</span>}
              </div>
            </section>
          </div>

          <aside class="live-aside">
            <header>
              <span>赛事列表</span>
            </header>
            <div class="live-match-list fk-scrollbar">
              {matches.length ? matches.map((match, index) => {
                const active = text(match.id) === text(activeMatch?.id) || (!activeMatch?.id && index === 0)
                const playableCount = playableLines(match).length
                return (
                  <a href={buildHref(query, { match: match.id })} class={active ? 'active' : ''}>
                    <div class="live-match-top">
                      <span>{text(match.league_name, '赛事')}</span>
                      <em class={statusClass(match.status)}>{statusText(match.status)}</em>
                    </div>
                    <div class="live-match-teams">
                      <div>
                        <MatchLogo src={match.home_logo} name={match.home} />
                        <span>{text(match.home, '主队')}</span>
                      </div>
                      <strong>{text(match.home_score, '0')} : {text(match.away_score, '0')}</strong>
                      <div>
                        <MatchLogo src={match.away_logo} name={match.away} />
                        <span>{text(match.away, '客队')}</span>
                      </div>
                    </div>
                    <p>{playableCount ? `${playableCount} 条可播线路` : '暂无可播线路'}</p>
                  </a>
                )
              }) : <div class="live-empty">暂无赛事</div>}
            </div>
            <Pager total={total} pageSize={pageSize} currentPage={currentPage} basePath="/live" query={query} />
          </aside>
        </section>
      </main>
    </PcShell>
  )
}
