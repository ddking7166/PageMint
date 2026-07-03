import { MovieCardVertical } from '../components/MovieCard.js'
import { PcShell } from '../components/Shell.js'
import { asArray, text } from '../lib/records.js'
import {
  categoryUrl,
  formatCountWithUnit,
  IMAGE_PLACEHOLDER,
  mediaUrl,
  moviePoster,
  moviePlayUrl,
  movieTitle,
  tagUrl,
  yearUrl,
} from '../lib/url.js'

import type { AnyRecord } from '../lib/records.js'

function selectedLink(data: AnyRecord): AnyRecord {
  return asArray(data.links).find((link) => link.is_selected === 'y') || asArray(data.links)[0] || {}
}

function playLineLabel(id: unknown): string {
  const value = text(id)
  if (value === 'line1') return '高速线路'
  if (value === 'line2') return '备份线路'
  return value || '默认线路'
}

function splitActors(value: unknown): string[] {
  return text(value)
    .split(/[,，/、]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function DetailPage({
  systemInfo,
  detail,
}: {
  systemInfo: AnyRecord
  detail: AnyRecord
}) {
  const title = movieTitle(detail)
  const links = asArray(detail.links)
  const activeLink = selectedLink(detail)
  const sortedLinks = links
  const playLinks = asArray(detail.play_links)
  const selectedPlayLine = playLinks[0] || {}
  const selectedPlayUrl = moviePlayUrl(
    selectedPlayLine.m3u8_url ||
      selectedPlayLine.preview_m3u8_url ||
      detail.m3u8_url ||
      detail.m3u8_url_source,
  )
  const actors = splitActors(detail.actor)
  const recommendItems = asArray(detail.relation_video).length
    ? asArray(detail.relation_video).slice(0, 16)
    : asArray(detail.hot_play).slice(0, 16)
  const guessItems = asArray(detail.relation_video).slice(0, 16)
  const hotItems = asArray(detail.hot_play).slice(0, 16)

  return (
    <PcShell
      title={`${title} - ${text(systemInfo.site_name, '凡客影视')}`}
      systemInfo={systemInfo}
      currentLabel="首页"
    >
      <main class="detail-page" data-movie-id={text(detail.id)}>
        <article>
          <div class="player-wrap">
            <div class="player-main">
              <div class="player-outer">
                <div class="player-placeholder" data-player-box>
                  <img src={mediaUrl(detail.img_x_source ?? detail.img_x ?? moviePoster(detail))} alt="" />
                  <video
                    class="player-video"
                    controls
                    playsInline
                    autoPlay
                    preload="none"
                    data-player-video
                    data-src={selectedPlayUrl}
                    data-link-id={text(activeLink.id || detail.link_id)}
                    data-play-line={text(selectedPlayLine.id)}
                  />
                  <div class="player-mask">
                    <button
                      type="button"
                      class="player-play-btn"
                      data-fetch-detail={text(detail.id)}
                      data-link-id={text(activeLink.id || detail.link_id)}
                      data-player-play
                    >
                      <span class="iconfont icon-play" aria-hidden="true" />
                    </button>
                    <div>
                      <strong>{title}</strong>
                      <span data-current-episode>{text(activeLink.name, '正片')}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="player-footer">
                <div class="action-wrap">
                  <button
                    type="button"
                    class={detail.has_love === 'y' ? 'action-item active' : 'action-item'}
                    data-movie-action="love"
                    data-movie-id={text(detail.id)}
                    data-action-active={detail.has_love === 'y' ? 'y' : 'n'}
                  >
                    <span class="iconfont icon-zan" aria-hidden="true" />
                    <span data-action-count>{text(detail.love, '0')}</span>
                  </button>
                  <button
                    type="button"
                    class={detail.has_favorite === 'y' ? 'action-item active' : 'action-item'}
                    data-movie-action="favorite"
                    data-movie-id={text(detail.id)}
                    data-action-active={detail.has_favorite === 'y' ? 'y' : 'n'}
                  >
                    <span class="iconfont icon-favorite" aria-hidden="true" />
                    <span data-action-count>{text(detail.favorite, '0')}</span>
                  </button>
                </div>
                <div class="client-result" id="client-api-result">点击播放按钮会通过 Hono 代理刷新详情接口</div>
              </div>
            </div>

            <aside class="detail-info">
              <div class="detail-tabs">
                <button type="button" class="active" data-detail-tab="info">简介</button>
                <button type="button" data-detail-tab="comment">评论</button>
              </div>
              <div class="detail-info-body">
                <div class="detail-tab-panel active" data-detail-panel="info">
                  <div class="detail-head">
                    <img
                      src={mediaUrl(detail.video_user?.img) || IMAGE_PLACEHOLDER.avatar}
                      alt=""
                      class="avatar"
                    />
                    <h1>{title}</h1>
                    <button type="button" data-detail-more>
                      <span>详情</span>
                      <span class="iconfont icon-arrow-right" aria-hidden="true" />
                    </button>
                  </div>
                  <div class="detail-stats">
                    <span>
                      <i class="iconfont icon-hot" aria-hidden="true" />
                      {formatCountWithUnit(detail.click)}
                    </span>
                    {detail.score ? <span class="score">{detail.score}</span> : null}
                  </div>
                  <div class="detail-tags">
                    {detail.categories ? (
                      <a href={categoryUrl(detail.cat_id, detail.categories)}>{detail.categories}</a>
                    ) : null}
                    {asArray(detail.tags).map((tag) => (
                      <a href={tagUrl(tag.id, tag.name)}>{text(tag.name)}</a>
                    ))}
                    {detail.release_at ? <a href={yearUrl(detail.release_at)}>{detail.release_at}</a> : null}
                  </div>

                  <div class="line-header">
                    <div>
                      {playLinks.map((line, index) => (
                        <button
                          type="button"
                          class={index === 0 ? 'active' : ''}
                          data-player-line={text(line.id)}
                          data-player-src={moviePlayUrl(line.m3u8_url || line.preview_m3u8_url)}
                        >
                          {playLineLabel(line.id)}
                        </button>
                      ))}
                    </div>
                    {links.length > 1 ? (
                      <button type="button" class="sort-btn" data-sort-episodes>
                        <img src="/assets/img/icon-sort.png" alt="" />
                        <span>排序</span>
                      </button>
                    ) : null}
                  </div>
                  <div class="episode-panel min-scrollbar">
                    <div class={detail.position === 'zy' ? 'episode-grid episode-grid-zy' : 'episode-grid'} data-episode-grid>
                      {sortedLinks.map((link) => (
                        <a
                          href={`/movie/detail/${text(detail.id)}?link_id=${encodeURIComponent(text(link.id))}`}
                          class={text(link.id) === text(activeLink.id) ? 'episode-btn active' : 'episode-btn'}
                          data-episode-link={text(link.id)}
                          data-episode-name={text(link.name)}
                          data-movie-id={text(detail.id)}
                        >
                          <span>{text(link.name)}</span>
                          {link.type === 'vip' ? <b>VIP</b> : null}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
                <div class="detail-tab-panel detail-comment-panel hidden" data-detail-panel="comment">
                  <div class="detail-comment-list min-scrollbar" data-comment-list>
                    <div class="comment-empty">加载中...</div>
                  </div>
                  <div class="detail-comment-form">
                    <textarea rows={2} maxLength={200} placeholder="在这里输入您的评论..." data-comment-text></textarea>
                    <div class="comment-form-meta">
                      <span data-comment-count>0/200</span>
                    </div>
                    <button type="button" data-comment-submit data-movie-id={text(detail.id)}>发表评论</button>
                  </div>
                </div>
                <div class="detail-more-panel hidden" data-detail-more-panel>
                  <div class="detail-more-head">
                    <span>简介</span>
                    <button type="button" data-detail-more-close aria-label="关闭">
                      <i class="iconfont icon-close2" aria-hidden="true" />
                    </button>
                  </div>
                  <div class="detail-more-scroll min-scrollbar">
                    <div class="detail-more-meta">
                      <div class="detail-poster">
                        <img src={moviePoster(detail)} alt={`${title}封面`} />
                      </div>
                      <div>
                        <h2>{title}</h2>
                        <div class="detail-tags compact">
                          {detail.categories ? <a href={categoryUrl(detail.cat_id, detail.categories)}>{detail.categories}</a> : null}
                          {asArray(detail.tags).map((tag) => <a href={tagUrl(tag.id, tag.name)}>{text(tag.name)}</a>)}
                        </div>
                        {text(detail.child_title) ? <p>{text(detail.child_title)}</p> : null}
                        {text(detail.director) ? <p>导演：{text(detail.director)}</p> : null}
                      </div>
                    </div>
                    <p class="detail-more-desc">剧情：{text(detail.description, '暂无简介')}</p>
                    {actors.length > 0 ? (
                      <div class="actor-list">
                        <strong>演职表</strong>
                        <div>
                          {actors.map((actor) => (
                            <a href={`/channel?keywords=${encodeURIComponent(actor)}`}>{actor}</a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div class="detail-actions">
                <button type="button" data-detail-error-open>
                  <img src="/assets/img/icon-warn.png" alt="" />
                  <span>报错</span>
                </button>
                <button type="button" data-detail-share-open data-share-url={text(detail.share_info?.share_link)}>
                  <img src="/assets/img/icon-share.png" alt="" />
                  <span>分享</span>
                </button>
                {systemInfo.pdf_url ? (
                  <a href={text(systemInfo.pdf_url)}>
                    <img src="/assets/img/icon-back-home.png" alt="" />
                    <span>回家的路</span>
                  </a>
                ) : null}
              </div>
            </aside>
          </div>
        </article>

        {asArray(detail.ads).length > 0 ? (
          <section class="ad-wrap">
            {asArray(detail.ads).map((ad) => (
              ad.link ? (
                <a href={text(ad.link)}>
                  <img src={mediaUrl(ad.content)} alt="" />
                </a>
              ) : (
                <div>
                  <img src={mediaUrl(ad.content)} alt="" />
                </div>
              )
            ))}
          </section>
        ) : null}

        <section class="recommend-wrap">
          <div class="recommend-tabs">
            <button type="button" class="active" data-recommend-tab="guess">猜你喜欢</button>
            <button type="button" data-recommend-tab="hot">热播</button>
            <div />
          </div>
          <div class="recommend-grid" data-recommend-panel="guess">
            {(guessItems.length ? guessItems : recommendItems).map((item) => <MovieCardVertical item={item} />)}
          </div>
          <div class="recommend-grid hidden" data-recommend-panel="hot">
            {(hotItems.length ? hotItems : recommendItems).map((item) => <MovieCardVertical item={item} />)}
          </div>
        </section>
        <div class="detail-modal hidden" data-detail-share-dialog>
          <div class="detail-modal-backdrop" data-detail-dialog-close></div>
          <div class="detail-modal-panel" role="dialog" aria-modal="true" aria-label="分享邀请">
            <h2>分享邀请</h2>
            <div class="share-url-row">
              <span>推广链接：</span>
              <input type="text" readOnly data-share-url-input />
            </div>
            <button type="button" data-share-copy>复制链接</button>
            <button type="button" class="ghost" data-detail-dialog-close>关闭</button>
          </div>
        </div>
        <div class="detail-modal hidden" data-detail-error-dialog>
          <div class="detail-modal-backdrop" data-detail-dialog-close></div>
          <div class="detail-modal-panel" role="dialog" aria-modal="true" aria-label="上报错误">
            <h2>上报错误</h2>
            <textarea rows={3} placeholder="请输入你遇到的问题" data-detail-error-text></textarea>
            <button type="button" data-detail-error-submit>立即提交</button>
            <button type="button" class="ghost" data-detail-dialog-close>取消</button>
          </div>
        </div>
      </main>
    </PcShell>
  )
}
