import { asArray, text } from '../lib/records.js'
import {
  channelUrl,
  formatCountWithUnit,
  IMAGE_PLACEHOLDER,
  linkUrl,
  mediaUrl,
  movieBackdrop,
  movieDetailUrl,
  moviePoster,
  movieTitle,
} from '../lib/url.js'

import type { AnyRecord } from '../lib/records.js'

function movieHorizontalPoster(movie: AnyRecord): string {
  return mediaUrl(movie.img_x_source ?? movie.img_y_source ?? movie.img_x ?? movie.img_y ?? movie.image)
}

function tags(movie: AnyRecord) {
  return [
    text(movie.area),
    text(movie.language),
    text(movie.release_at),
  ].filter(Boolean)
}

function todayUpdateNum(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? num : 0
}

function UpdateBadge({ value }: { value: unknown }) {
  const num = todayUpdateNum(value)
  if (!num) return null
  return <span class="update-badge" aria-label={`今日更新 ${num} 集`}>{num}</span>
}

export function ModuleTitle({
  title,
  icon = '/assets/img/icon-mmovie.png',
  moreUrl,
}: {
  title: string
  icon?: string
  moreUrl?: string
}) {
  return (
    <div class="module-title">
      <h2>
        <img src={icon} alt="" />
        <span>{title}</span>
      </h2>
      {moreUrl ? (
        <a href={moreUrl} class="more-btn">
          <span>更多</span>
          <i class="iconfont icon-arrow-right" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  )
}

export function MovieCardVertical({ item }: { item: AnyRecord }) {
  if (!item) return null
  const title = movieTitle(item)
  const href = movieDetailUrl(item)

  return (
    <article class="item-wrap vertical movie-card-vertical">
      <a href={href} title={title} class="absolute-full card-hit">{title}</a>
      <div class="normal-wrap">
        <div class="lazy-load poster-box poster-vertical">
          <img src={moviePoster(item)} alt={`${title}-${text(item.child_title ?? item.category, '影视')}封面`} loading="lazy" />
          <UpdateBadge value={item.today_update_num} />
          <div class="float-meta">
            <div class="tag-row">
              {tags(item).map((tag) => <span class="tag">{tag}</span>)}
            </div>
            <strong>{text(item.score)}</strong>
          </div>
        </div>
        <div class="meta-wrap">
          <a href={href} title={title} class="normal-title">{title}</a>
          <div class="category">{text(item.child_title ?? item.category)}</div>
        </div>
      </div>
      <div class="hover-wrap">
        <div class="poster-box poster-vertical">
          <img src={moviePoster(item)} alt="" loading="lazy" />
          <UpdateBadge value={item.today_update_num} />
          <div class="hover-info">
            <div class="score">{text(item.score)}</div>
            <a href={href} title={title}>{title}</a>
            <div class="tag-row">
              {tags(item).map((tag) => <span class="tag">{tag}</span>)}
            </div>
            <div class="category">{text(item.child_title ?? item.category)}</div>
          </div>
        </div>
      </div>
    </article>
  )
}

export function MovieCardHorizontal({ item }: { item: AnyRecord }) {
  if (!item) return null
  const title = movieTitle(item)
  const href = movieDetailUrl(item)

  return (
    <article class="item-wrap horizontal movie-card-horizontal">
      <a href={href} title={title} class="absolute-full card-hit">{title}</a>
      <div class="normal-wrap">
        <div class="lazy-load poster-box poster-horizontal">
          <img src={movieHorizontalPoster(item)} alt={`${title}-${text(item.category ?? item.child_title, '影视')}封面`} loading="lazy" />
          <div class="float-meta">
            <div>
              <i class="iconfont icon-hot" aria-hidden="true" />
              {item.click ? <span>{formatCountWithUnit(item.click)}</span> : null}
            </div>
            <strong>{text(item.score)}</strong>
          </div>
        </div>
        <div class="meta-wrap">
          <a href={href} title={title} class="normal-title">{title}</a>
          <div class="category">{text(item.category ?? item.child_title)}</div>
        </div>
      </div>
    </article>
  )
}

export function PcHorizontalScrollRow({ items, vertical = true }: { items: AnyRecord[]; vertical?: boolean }) {
  return (
    <div class="fk-hscroll-row" data-hscroll-row>
      <div class="hscroll-track-wrap">
        <div class="hscroll-scroller" data-hscroll-scroller>
          {items.map((item) => (
            <div class="hscroll-item">
              {vertical ? <MovieCardVertical item={item} /> : <MovieCardHorizontal item={item} />}
            </div>
          ))}
        </div>
        <div class="hscroll-nav">
          <button type="button" class="hscroll-nav-btn hscroll-prev" data-hscroll-prev aria-label="向左滚动">
            <span>‹</span>
          </button>
          <button type="button" class="hscroll-nav-btn hscroll-next" data-hscroll-next aria-label="向右滚动">
            <span>›</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export function VerticalScrollSection({
  title,
  items,
  moreUrl,
  isNew,
}: {
  title: string
  items: AnyRecord[]
  moreUrl?: string
  isNew?: boolean
}) {
  if (!items.length) return null
  return (
    <section class="moudle-wrap">
      <ModuleTitle
        title={title}
        icon={isNew ? '/assets/img/icon-mnew.png' : '/assets/img/icon-mmovie.png'}
        moreUrl={moreUrl}
      />
      <div class="video-wrap">
        <PcHorizontalScrollRow items={items} />
      </div>
    </section>
  )
}

export function VerticalSection({
  title,
  items,
  className = 'style1 row2',
  moreUrl,
  isNew,
}: {
  title: string
  items: AnyRecord[]
  className?: string
  moreUrl?: string
  isNew?: boolean
}) {
  if (!items.length) return null
  return (
    <section class="moudle-wrap">
      <ModuleTitle
        title={title}
        icon={isNew ? '/assets/img/icon-mnew.png' : '/assets/img/icon-mmovie.png'}
        moreUrl={moreUrl}
      />
      <div class="video-wrap">
        <div class={`list-wrap ${className}`}>
          {items.map((item) => <MovieCardVertical item={item} />)}
        </div>
      </div>
    </section>
  )
}

export function HorizontalSection({
  title,
  items,
  moreUrl,
}: {
  title: string
  items: AnyRecord[]
  moreUrl?: string
}) {
  if (!items.length) return null
  return (
    <section class="moudle-wrap">
      <ModuleTitle title={title} moreUrl={moreUrl} />
      <div class="video-wrap">
        <div class="list-wrap style2 row2">
          {items.map((item) => <MovieCardHorizontal item={item} />)}
        </div>
      </div>
    </section>
  )
}

export function HomeMainBlock({ block }: { block: AnyRecord }) {
  const filters = asArray(block.filters).filter((filter) => asArray(filter.items).length > 0)
  const activeItems = filters.length > 0 ? asArray(filters[0].items) : asArray(block.items)

  return (
    <section class="moudle-wrap home-main-block">
      <div class="video-wrap">
        <div class="module-title module-title-with-tabs">
          <h2>
            <img src="/assets/img/icon-mmovie.png" alt="" />
            <span>{text(block.cat_name, '精选内容')}</span>
          </h2>
          {filters.length > 0 ? (
            <div class="module-tabs">
              {filters.map((filter, index) => (
                <button type="button" class={index === 0 ? 'active' : ''}>{text(filter.name)}</button>
              ))}
            </div>
          ) : null}
          <a href={`/channel/${text(block.cat_code)}`} class="more-btn">
            <span>更多</span>
            <i class="iconfont icon-arrow-right" aria-hidden="true" />
          </a>
        </div>
        <div class="list-wrap style3 row2">
          {activeItems.map((item) => <MovieCardVertical item={item} />)}
        </div>
      </div>
      <PcRankSidebar title={text(block.cat_name, '影视')} items={asArray(block.rank_items)} />
    </section>
  )
}

export function PcRankSidebar({ title, items }: { title: string; items: AnyRecord[] }) {
  if (!items.length) return null
  return (
    <aside class="ranking-wrap">
      <div class="module-title">
        <div class="rank-title">{title} · 排行榜</div>
      </div>
      <div class="rank-list">
        {items.slice(0, 10).map((item, index) => (
          <a href={movieDetailUrl(item)} title={movieTitle(item)} class="rank-item">
            <i class={`rank-number iconfont icon-number-${index + 1}`} aria-hidden="true" />
            <div class="rank-meta">
              <div class="title">{movieTitle(item)}</div>
              <div class="rank-tags">
                {tags(item).map((tag) => <span class="tag">{tag}</span>)}
              </div>
            </div>
            {item.click ? (
              <span class="rank-hot">
                <i class="iconfont icon-hot" aria-hidden="true" />
                {formatCountWithUnit(item.click)}
              </span>
            ) : null}
            <strong>{text(item.score)}</strong>
          </a>
        ))}
      </div>
    </aside>
  )
}

export function Banner({
  banners,
  systemInfo,
  rankItems = [],
}: {
  banners: AnyRecord[]
  systemInfo: AnyRecord
  rankItems?: AnyRecord[]
}) {
  if (!banners.length) return null
  const categories = asArray(systemInfo.categories)

  return (
    <section id="banner_wrap" class="banner-wrap" data-banner-root>
      <div class="banner-stage">
        {banners.map((banner, index) => {
          const href = linkUrl(banner.link, banner.name)
          return (
            <a
              href={href}
              title={text(banner.name)}
              class={`banner-slide ${index === 0 ? 'active' : ''}`}
              data-banner-slide
            >
              <img src={mediaUrl(banner.content_source ?? banner.content ?? banner.banner ?? banner.image)} alt={text(banner.name)} />
            </a>
          )
        })}
      </div>

      <div class="banner-pagination pagination-pc min-scrollbar fk-banner-pagination" data-banner-pagination>
        {banners.map((banner, index) => (
          <a
            href={linkUrl(banner.link, banner.name)}
            class={index === 0 ? 'active' : ''}
            data-banner-index={index}
          >
            <span>{text(banner.name)}</span>
          </a>
        ))}
      </div>

      <div class="banner-bottom">
        <div class="banner-categories">
          {categories.map((category) => (
            <h3>
              <a href={text(category.url, `/channel/${text(category.value ?? category.id)}`)} title={text(category.name)}>
                {text(category.name)}
              </a>
            </h3>
          ))}
        </div>
        <div class="banner-divider" />
        <div class="banner-rank-updates">
          {rankItems.map((item, index) => (
            <span>
              <a href={movieDetailUrl(item)} title={text(item.movie_name ?? item.name)}>
                {text(item.movie_name ?? item.name)}
              </a>
              <UpdateBadge value={item.num} />
            </span>
          ))}
        </div>
        <div class="banner-divider" />
        <div class="banner-actions">
          <a href={text(systemInfo.pdf_url, '/pdf')} rel="nofollow">
            <img src="/assets/img/icon-back-home.png" alt="" />
            <span>回家</span>
          </a>
        </div>
      </div>
    </section>
  )
}

export function PlaylistSection({ playlists }: { playlists: AnyRecord[] }) {
  if (!playlists.length) return null
  return (
    <section class="moudle-wrap">
      <ModuleTitle title="片单" />
      <div class="playlist-row">
        {playlists.map((item) => {
          const preview = asArray(item.items)[0] ?? {}
          return (
            <a class="playlist-card" href={`/collection/${text(item.tag_id)}`}>
              <div class="playlist-stack">
                <img src={moviePoster(preview) || IMAGE_PLACEHOLDER.poster} alt="" />
              </div>
              <h3>{text(item.tag_name, '精选片单')}</h3>
              <span>+{asArray(item.items).length}</span>
            </a>
          )
        })}
      </div>
    </section>
  )
}

export function sectionUrlFromFilter(value: unknown): string {
  if (!value || typeof value !== 'string') return '/channel'
  try {
    return channelUrl(JSON.parse(value))
  } catch {
    return '/channel'
  }
}
