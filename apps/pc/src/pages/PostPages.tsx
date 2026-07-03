import { RichText } from '../components/RichText.js'
import { EmptyState, PcShell } from '../components/Shell.js'
import { asArray, text } from '../lib/records.js'
import { IMAGE_PLACEHOLDER, mediaUrl } from '../lib/url.js'

import type { AnyRecord } from '../lib/records.js'

function postImage(item: AnyRecord): string {
  return mediaUrl(item.img ?? item.img_x ?? item.cover ?? item.image ?? IMAGE_PLACEHOLDER.horizontal)
}

function postTitle(item: AnyRecord): string {
  return text(item.title ?? item.name, '详情')
}

function postSummary(item: AnyRecord): string {
  return text(item.description ?? item.summary ?? item.content)
}

export function PostListPage({
  systemInfo,
  data,
  title,
}: {
  systemInfo: AnyRecord
  data: AnyRecord
  title: string
}) {
  const items = asArray(data.items ?? data.data)
  const heading = text(data.cat_name, title)

  return (
    <PcShell title={`${text(systemInfo.site_name, '凡客影视')}-${heading}`} systemInfo={systemInfo} currentLabel="首页">
      <main class="post-page main-wrap _wrap-px _header-pt">
        <h1>{heading}</h1>
        <div class="post-list">
          {items.map((item) => (
            <a href={`/post/detail/${text(item.id)}`} class="post-card">
              {item.img || item.img_x ? <img src={postImage(item)} alt="" loading="lazy" /> : null}
              <div>
                <h2>{postTitle(item)}</h2>
                <p>{postSummary(item)}</p>
              </div>
            </a>
          ))}
        </div>
        {items.length < 1 ? <EmptyState text="暂无帖子" /> : null}
      </main>
    </PcShell>
  )
}

export function PostRankPage({
  systemInfo,
  rank,
}: {
  systemInfo: AnyRecord
  rank: AnyRecord
}) {
  const items = asArray(rank.items ?? rank.data)

  return (
    <PcShell title={`${text(systemInfo.site_name, '凡客影视')} - 吃瓜榜单`} systemInfo={systemInfo} currentLabel="首页">
      <main class="post-page main-wrap _wrap-px _header-pt">
        <h1>吃瓜榜单</h1>
        <div class="post-rank-list">
          {items.map((item, index) => (
            <a href={`/post/rankDetail/${text(item.id)}`} class="post-rank-card">
              <strong>{index + 1}</strong>
              <div>
                <h2>{postTitle(item)}</h2>
                <p>{postSummary(item)}</p>
              </div>
              <span>›</span>
            </a>
          ))}
        </div>
        {items.length < 1 ? <EmptyState text="暂无榜单" /> : null}
      </main>
    </PcShell>
  )
}

export function PostRankDetailPage({
  systemInfo,
  detail,
}: {
  systemInfo: AnyRecord
  detail: AnyRecord
}) {
  const items = asArray(detail.items ?? detail.posts ?? detail.data)
  const heading = text(detail.name, '榜单详情')

  return (
    <PcShell title={`${text(systemInfo.site_name, '凡客影视')} - ${heading}`} systemInfo={systemInfo} currentLabel="首页">
      <main class="post-page main-wrap _wrap-px _header-pt">
        <h1>{heading}</h1>
        {text(detail.description) ? <p class="post-desc">{text(detail.description)}</p> : null}
        <div class="post-list">
          {items.map((item) => {
            const content = (
              <>
                {item.img || item.img_x ? <img src={postImage(item)} alt="" loading="lazy" /> : null}
                <div>
                  <h2>{postTitle(item)}</h2>
                  <p>{postSummary(item)}</p>
                </div>
              </>
            )

            return item.post_id ? (
              <a href={`/post/detail/${text(item.post_id)}`} class="post-card">{content}</a>
            ) : (
              <div class="post-card">{content}</div>
            )
          })}
        </div>
        {items.length < 1 ? <EmptyState text="暂无榜单内容" /> : null}
      </main>
    </PcShell>
  )
}

export function PostDetailPage({
  systemInfo,
  post,
  comments,
}: {
  systemInfo: AnyRecord
  post: AnyRecord
  comments: AnyRecord[]
}) {
  const heading = postTitle(post)

  return (
    <PcShell title={`${heading} - ${text(systemInfo.site_name, '凡客影视')}`} systemInfo={systemInfo} currentLabel="首页">
      <main class="post-page post-detail-page main-wrap _wrap-px _header-pt">
        <article>
          <h1>{heading}</h1>
          <div class="post-meta">{text(post.label ?? post.created_at)}</div>
          <RichText className="post-rich" html={post.content || post.description || ''} />
          <section class="comment-panel">
            <h2>评论</h2>
            {comments.length > 0 ? (
              <div class="comment-list">
                {comments.map((comment) => (
                  <div class="comment-item">
                    <strong>{text(comment.nickname ?? comment.user_name, '游客')}</strong>
                    <p>{text(comment.content ?? comment.text)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div class="comment-empty">暂无评论</div>
            )}
          </section>
        </article>
      </main>
    </PcShell>
  )
}

export function ArticleDetailPage({
  systemInfo,
  article,
}: {
  systemInfo: AnyRecord
  article: AnyRecord
}) {
  const heading = postTitle(article)

  return (
    <PcShell title={`${heading} - ${text(systemInfo.site_name, '凡客影视')}`} systemInfo={systemInfo} currentLabel="首页">
      <main class="post-page post-detail-page main-wrap _wrap-px _header-pt">
        <article>
          <h1>{heading}</h1>
          <RichText className="post-rich" html={article.content || article.description || ''} />
        </article>
      </main>
    </PcShell>
  )
}
