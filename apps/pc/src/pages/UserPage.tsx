import { MovieCardVertical } from '../components/MovieCard.js'
import { EmptyState, PcShell } from '../components/Shell.js'
import { asArray, text } from '../lib/records.js'
import { IMAGE_PLACEHOLDER, mediaUrl } from '../lib/url.js'

import type { AnyRecord } from '../lib/records.js'

const SECTION_LABELS: Record<string, string> = {
  index: '我的资料',
  favorite: '收藏记录',
  history: '观看记录',
}

const CATEGORY_IDS: Record<string, string> = {
  zy: '4',
  tv: '5',
  movie: '6',
  comic: '7',
  jlp: '8',
  short_tv: '9',
  music: '10',
  js: '11',
}

function userNumber(user: AnyRecord): string {
  return text(user.username ?? user.user_id ?? user.id, '游客')
}

function userName(user: AnyRecord): string {
  return text(user.nickname, '游客')
}

function userAvatar(user: AnyRecord): string {
  const img = text(user.img)
  return img ? mediaUrl(img) : IMAGE_PLACEHOLDER.avatar
}

function shareLink(user: AnyRecord, requestOrigin: string): string {
  const existing = text(user.share_link)
  if (existing) return existing
  const username = userNumber(user)
  if (!username || username === '游客') return ''
  return `${requestOrigin || ''}?invite=${username}`
}

function listItems(data: AnyRecord): AnyRecord[] {
  if (Array.isArray(data)) return data
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.items)) return data.items
  if (data.data && typeof data.data === 'object') {
    return asArray(data.data.data ?? data.data.items ?? data.data.list)
  }
  return asArray(data.list)
}

function filterCategories(systemInfo: AnyRecord) {
  return asArray<AnyRecord>(systemInfo.categories)
    .map((category): AnyRecord & { catId: string } => ({
      ...category,
      catId: CATEGORY_IDS[text(category.value)],
    }))
    .filter((category) => category.catId)
}

export function UserPage({
  section,
  systemInfo,
  user,
  data,
  requestOrigin,
}: {
  section: 'index' | 'favorite' | 'history'
  systemInfo: AnyRecord
  user: AnyRecord
  data?: AnyRecord
  requestOrigin: string
}) {
  const active = section
  const items = data ? listItems(data) : []
  const title = SECTION_LABELS[section] ?? '个人中心'

  return (
    <PcShell
      title={`个人中心 - ${text(systemInfo.site_name, '凡客影视')}`}
      systemInfo={systemInfo}
      currentLabel="个人中心"
    >
      <main class="user-page main-wrap">
        <UserMenu user={user} active={active} />
        <section class="user-content">
          {section === 'index' ? (
            <ProfilePanel user={user} requestOrigin={requestOrigin} />
          ) : (
            <UserListPanel
              title={title}
              section={section}
              systemInfo={systemInfo}
              items={items}
            />
          )}
        </section>
      </main>
    </PcShell>
  )
}

function UserMenu({ user, active }: { user: AnyRecord; active: string }) {
  const menus = [
    ['index', '/user', '个人中心'],
    ['favorite', '/user/favorite', '我的收藏'],
    ['history', '/user/history', '观看记录'],
  ] as const

  return (
    <aside class="user-menu">
      <a href="/user" class="user-menu-head">
        <img src={userAvatar(user)} alt="" />
        <div>
          <div>{userName(user)}</div>
          <button type="button" data-copy-text={userNumber(user)}>
            <span>编号：{userNumber(user)}</span>
            <span class="iconfont icon-copy" />
          </button>
        </div>
        <span>›</span>
      </a>
      <nav class="user-menu-list">
        {menus.map(([key, href, label]) => (
          <a href={href} class={active === key ? 'active' : ''}>
            <span>{label}</span>
            <span>›</span>
          </a>
        ))}
        <button type="button" data-switch-account>
          <span>切换帐号</span>
          <span>›</span>
        </button>
      </nav>
    </aside>
  )
}

function ProfilePanel({ user, requestOrigin }: { user: AnyRecord; requestOrigin: string }) {
  const number = userNumber(user)
  const url = shareLink(user, requestOrigin)

  return (
    <div class="profile-panel">
      <h1>我的资料</h1>
      <div class="profile-main">
        <img src={userAvatar(user)} alt="" />
        <div>
          <div class="profile-name">{userName(user)}</div>
          <button type="button" class="profile-copy" data-copy-text={number}>
            <span>编号：</span>
            <strong>{number}</strong>
            <span class="iconfont icon-copy" />
          </button>
          {text(user.group_name) ? <div class="profile-group">{text(user.group_name)}</div> : null}
        </div>
      </div>
      <div class="profile-row">
        <span>到期时间：</span>
        <strong>{user.is_vip === 'y' ? text(user.group_end_time, '游客') : '游客'}</strong>
      </div>
      <button type="button" class="profile-row profile-link" data-copy-text={url}>
        <span>推广链接：</span>
        <strong>{url || '暂无'}</strong>
        <span class="iconfont icon-copy" />
      </button>
    </div>
  )
}

function UserListPanel({
  title,
  section,
  systemInfo,
  items,
}: {
  title: string
  section: 'favorite' | 'history'
  systemInfo: AnyRecord
  items: AnyRecord[]
}) {
  return (
    <div class="user-list-panel">
      <div class="user-list-head">
        <h1>{title}</h1>
      </div>
      <div class="user-category-filter">
        <a class="active" href={`/user/${section}`}>全部</a>
        {filterCategories(systemInfo).map((category) => (
          <a href={`/user/${section}?cat_id=${category.catId}`}>
            {text(category.name ?? category.value)}
          </a>
        ))}
      </div>
      {items.length > 0 ? (
        <div class="user-grid fk-vertical-grid">
          {items.map((item) => <MovieCardVertical item={item} />)}
        </div>
      ) : (
        <EmptyState text={section === 'favorite' ? '还没有收藏哦!' : '还没有观看记录哦!'} />
      )}
    </div>
  )
}
