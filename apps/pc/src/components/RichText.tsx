import { mediaUrl } from '../lib/url.js'

type Segment =
  | { type: 'html'; value: string }
  | { type: 'image'; src: string; alt: string }

const imageTagPattern = new RegExp('<' + 'img\\b([^>]*)>', 'gi')

function readAttribute(attributes: string, name: string): string {
  const pattern = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')
  const match = attributes.match(pattern)
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? ''
}

function splitRichText(value: string): Segment[] {
  const segments: Segment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  imageTagPattern.lastIndex = 0
  while ((match = imageTagPattern.exec(value))) {
    if (match.index > lastIndex) {
      segments.push({ type: 'html', value: value.slice(lastIndex, match.index) })
    }

    const attributes = match[1] || ''
    const src = readAttribute(attributes, 'src')
    if (src) {
      segments.push({
        type: 'image',
        src,
        alt: readAttribute(attributes, 'alt'),
      })
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < value.length) {
    segments.push({ type: 'html', value: value.slice(lastIndex) })
  }

  return segments
}

export function RichText({ html, className = '' }: { html?: string | null; className?: string }) {
  const segments = splitRichText(html || '')

  return (
    <div class={`rich-text ${className}`}>
      {segments.map((segment) =>
        segment.type === 'image' ? (
          <img src={mediaUrl(segment.src)} alt={segment.alt} loading="lazy" />
        ) : (
          <div class="contents" dangerouslySetInnerHTML={{ __html: segment.value }} />
        ),
      )}
    </div>
  )
}
