import {
  Banner,
  HomeMainBlock,
  HorizontalSection,
  PlaylistSection,
  VerticalScrollSection,
  sectionUrlFromFilter,
} from '../components/MovieCard.js'
import { PcShell } from '../components/Shell.js'
import { asArray, text } from '../lib/records.js'

import type { AnyRecord } from '../lib/records.js'

export function HomePage({
  systemInfo,
  data,
}: {
  systemInfo: AnyRecord
  data: AnyRecord
}) {
  return (
    <PcShell
      title={text(systemInfo.site_title || systemInfo.site_name, '凡客影视')}
      systemInfo={systemInfo}
      headerOverlay={asArray(data.banner).length > 0}
      currentLabel="首页"
    >
      <Banner
        banners={asArray(data.banner)}
        systemInfo={systemInfo}
        rankItems={asArray(data.rank_updated_items)}
      />
      <main class="main-wrap _wrap-px">
        <h1 class="sr-only">{text(systemInfo.site_title || systemInfo.site_name, '凡客影视')}</h1>
        <VerticalScrollSection title="最新更新" items={asArray(data.new_items)} isNew />
        <VerticalScrollSection title="猜你喜欢" items={asArray(data.guess_you_like)} />
        <VerticalScrollSection title="热播" items={asArray(data.hot_play)} />
        <PlaylistSection playlists={asArray(data.playlists)} />
        {asArray(data.main_block).map((block) => (
          <HomeMainBlock block={block} />
        ))}
        {asArray(data.other_block)
          .filter((block) => text(block.cat_name))
          .map((block) => (
            <HorizontalSection
              title={text(block.cat_name)}
              items={asArray(block.items)}
              moreUrl={sectionUrlFromFilter(block.filter)}
            />
          ))}
      </main>
    </PcShell>
  )
}
