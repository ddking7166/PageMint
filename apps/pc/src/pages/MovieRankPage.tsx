import { MovieCardVertical } from '../components/MovieCard.js'
import { PcShell, EmptyState } from '../components/Shell.js'
import { asArray, text } from '../lib/records.js'

import type { AnyRecord } from '../lib/records.js'

function rankPath(code?: string | null): string {
  const normalized = text(code)
  if (!normalized || normalized === 'movie') return '/movie/rank'
  return `/movie/rank/${encodeURIComponent(normalized)}`
}

export function MovieRankPage({
  systemInfo,
  items,
  code,
}: {
  systemInfo: AnyRecord
  items: AnyRecord[]
  code: string
}) {
  const categories = asArray(systemInfo.categories).filter(
    (category) => !['jlp', 'js', 'music'].includes(text(category.value)),
  )

  return (
    <PcShell title={`${text(systemInfo.site_title || systemInfo.site_name, '凡客影视')}`} systemInfo={systemInfo} currentLabel="首页">
      <main class="movie-rank-page main-wrap _header-pt _wrap-px">
        <header class="list-page-head">
          <h1>热播榜单</h1>
        </header>
        <nav class="rank-category-tabs">
          {categories.map((category) => (
            <a href={rankPath(text(category.value))} class={text(category.value) === code ? 'active' : ''}>
              {text(category.name)}
            </a>
          ))}
        </nav>
        {items.length > 0 ? (
          <div class="list-wrap style1">
            {items.map((item) => <MovieCardVertical item={item} />)}
          </div>
        ) : (
          <EmptyState text="暂无榜单内容" />
        )}
      </main>
    </PcShell>
  )
}
