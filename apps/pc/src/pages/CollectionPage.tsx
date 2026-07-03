import { MovieCardVertical } from '../components/MovieCard.js'
import { EmptyState, PcShell } from '../components/Shell.js'
import { asArray, text } from '../lib/records.js'

import type { AnyRecord } from '../lib/records.js'

export function CollectionPage({
  systemInfo,
  playlist,
}: {
  systemInfo: AnyRecord
  playlist: AnyRecord
}) {
  const title = text(playlist.tag_name ?? playlist.name, '片单')
  const items = asArray(playlist.items)

  return (
    <PcShell title={`${title} - 片单 | ${text(systemInfo.site_name, '凡客影视')}`} systemInfo={systemInfo} currentLabel="首页">
      <main class="collection-page main-wrap _wrap-px _header-pt">
        <header class="collection-head">
          <p>片单</p>
          <h1>{title}</h1>
          {items.length > 0 ? <div>共 {items.length} 部影片</div> : null}
        </header>
        {items.length > 0 ? (
          <div class="list-wrap style1">
            {items.map((item) => <MovieCardVertical item={item} />)}
          </div>
        ) : (
          <EmptyState text="暂无片单内容" />
        )}
      </main>
    </PcShell>
  )
}
