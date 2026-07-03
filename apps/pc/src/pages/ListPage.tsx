import { MovieCardVertical } from '../components/MovieCard.js'
import { EmptyState, PcShell } from '../components/Shell.js'
import { asArray, text } from '../lib/records.js'

import type { AnyRecord } from '../lib/records.js'

export function ListPage({
  title,
  systemInfo,
  items,
}: {
  title: string
  systemInfo: AnyRecord
  items: AnyRecord[]
}) {
  const list = asArray(items)

  return (
    <PcShell
      title={`${title} - ${text(systemInfo.site_name, '凡客影视')}`}
      systemInfo={systemInfo}
      currentLabel={title}
    >
      <main class="main-wrap _wrap-px _header-pt">
        <section class="list-page-head">
          <h1>{title}</h1>
          <div class="tab-active-line">
            <a href="/channel" class="item-wrap active">全部</a>
            <a href="/movie/rank" class="item-wrap">排行</a>
          </div>
        </section>
        {list.length > 0 ? (
          <div class="list-wrap fk-vertical-grid">
            {list.map((item) => <MovieCardVertical item={item} />)}
          </div>
        ) : (
          <EmptyState text="暂无数据" />
        )}
      </main>
    </PcShell>
  )
}
