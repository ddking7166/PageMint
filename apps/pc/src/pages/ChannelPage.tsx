import {
  Banner,
  HorizontalSection,
  VerticalSection,
  sectionUrlFromFilter,
} from '../components/MovieCard.js'
import { EmptyState, PcShell } from '../components/Shell.js'
import { asArray, text } from '../lib/records.js'

import type { AnyRecord } from '../lib/records.js'

export function ChannelPage({
  title,
  systemInfo,
  data,
  other = false,
}: {
  title: string
  systemInfo: AnyRecord
  data: AnyRecord
  other?: boolean
}) {
  const banners = asArray(data.banner)
  const blocks = asArray(data.block)

  return (
    <PcShell
      title={`${title} - ${text(systemInfo.site_name, '凡客影视')}`}
      systemInfo={systemInfo}
      currentLabel={title}
      headerOverlay={!other && banners.length > 0}
    >
      {!other ? (
        <Banner banners={banners} systemInfo={systemInfo} rankItems={asArray(data.rank_updated_items)} />
      ) : null}
      <main class={`main-wrap _wrap-px ${other || banners.length === 0 ? '_header-pt' : ''}`}>
        <h1 class="sr-only">{title}</h1>
        {blocks.length > 0 ? (
          blocks.map((block, index) => (
            other ? (
              <HorizontalSection
                title={text(block.name, title)}
                items={asArray(block.items)}
                moreUrl={sectionUrlFromFilter(block.filter)}
              />
            ) : (
              <VerticalSection
                title={text(block.name, title)}
                items={asArray(block.items)}
                className="style1 row1"
                moreUrl={sectionUrlFromFilter(block.filter)}
                isNew={index === 0}
              />
            )
          ))
        ) : (
          <EmptyState text="暂无数据" />
        )}
      </main>
    </PcShell>
  )
}
