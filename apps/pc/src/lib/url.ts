import { loadAppConfig } from '../config/app-config.js'
import { text } from './records.js'

import type { AnyRecord } from './records.js'

export const IMAGE_PLACEHOLDER = {
  avatar: '/h5/images/placeholder/placeholder1.png',
  horizontal: '/h5/images/placeholder/placeholder2.png',
  banner: '/h5/images/placeholder/placeholder3.png',
  ad: '/h5/images/placeholder/placeholder4.png',
  poster: '/h5/images/placeholder/placeholder5.png',
  empty: '/h5/images/empty.png',
}

export function staticUrl(value: string): string {
  return `/${value.replace(/^\/+/, '')}`
}

export function mediaUrl(value?: string | null): string {
  const raw = text(value)
  if (!raw) return IMAGE_PLACEHOLDER.poster
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw
  if (
    raw.startsWith('/assets/') ||
    raw.startsWith('assets/') ||
    raw.startsWith('/h5/') ||
    raw.startsWith('h5/') ||
    raw.startsWith('/common/') ||
    raw.startsWith('common/') ||
    raw.startsWith('/load/') ||
    raw.startsWith('load/')
  ) {
    return raw.startsWith('/') ? raw : staticUrl(raw)
  }

  const cdn = loadAppConfig().thirdParty.fanke.publicCdnBaseUrl
  if (!cdn) return raw.startsWith('/') ? raw : `/${raw}`

  return `${cdn.replace(/\/+$/, '')}/${raw.replace(/^\/+/, '')}`
}

export function moviePlayUrl(value?: string | null): string {
  const raw = text(value)
  if (!raw) return ''
  if (/^(blob:|data:)/i.test(raw)) return raw

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw)
      if (url.origin === 'https://fktv.me' && url.pathname.startsWith('/ysapi/')) {
        return `${url.pathname}${url.search}${url.hash}`
      }
    } catch {
      return raw
    }
    return raw
  }

  if (raw.startsWith('//')) return `https:${raw}`
  return raw.startsWith('/') ? raw : `/${raw.replace(/^\/+/, '')}`
}

export function movieTitle(movie: AnyRecord): string {
  return text(movie.name ?? movie.movie_name ?? movie.title, '未命名影片')
}

export function movieId(movie: AnyRecord): string {
  return text(movie.id ?? movie.movie_id)
}

export function moviePoster(movie: AnyRecord): string {
  return mediaUrl(
    movie.img_y_source ??
      movie.img_x_source ??
      movie.img_y ??
      movie.img_x ??
      movie.img ??
      movie.vod_pic ??
      movie.pic ??
      movie.cover ??
      movie.poster ??
      movie.image ??
      movie.thumbnail ??
      movie.movie_pic,
  )
}

export function movieBackdrop(movie: AnyRecord): string {
  return mediaUrl(
    movie.content_source ??
      movie.content ??
      movie.banner_source ??
      movie.banner ??
      movie.img_x_source ??
      movie.img_y_source ??
      movie.img_x ??
      movie.cover_horizontal ??
      movie.horizontal_pic ??
      movie.backdrop ??
      movie.image ??
      movie.vod_pic,
  )
}

export function movieDetailUrl(movie: AnyRecord): string {
  const canonical = normalizeCanonicalPath(movie.canonical_path)
  if (isMovieSeoDetailPath(canonical)) return canonical
  const id = movieId(movie)
  const slug = seoSlug(text(movie.seo_slug ?? movie.name ?? movie.movie_name ?? movie.title))
  if (id && slug) return `/movie/${encodeURIComponent(id)}/${slug}`
  return id ? `/movie/detail/${encodeURIComponent(id)}` : '#'
}

export function linkUrl(value?: string | null, label?: string | number | null): string {
  const raw = text(value)
  if (!raw) return '#'
  if (raw.startsWith('movie://')) {
    const id = raw.replace('movie://', '')
    return label ? movieDetailUrl({ id, name: String(label) }) : `/movie/detail/${id}`
  }
  if (raw.startsWith('share://') || raw.startsWith('buyvip://')) return '/user'
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return '/'
  return raw
}

export function categoryUrl(id?: string | number | null, label?: string | number | null): string {
  const normalizedId = text(id)
  if (!normalizedId) return '/channel'
  const slug = seoSlug(text(label))
  return slug ? `/category/${encodeURIComponent(normalizedId)}/${slug}` : `/category/${encodeURIComponent(normalizedId)}`
}

export function tagUrl(id?: string | number | null, label?: string | number | null): string {
  const normalizedId = text(id)
  if (!normalizedId) return '/channel'
  const slug = seoSlug(text(label))
  return slug ? `/tag/${encodeURIComponent(normalizedId)}/${slug}` : `/tag/${encodeURIComponent(normalizedId)}`
}

export function yearUrl(year?: string | number | null): string {
  const normalized = text(year)
  return normalized ? `/channel/filter/year/${encodeURIComponent(normalized)}` : '/channel'
}

export function channelUrl(filter?: unknown): string {
  if (!filter || typeof filter !== 'object') return '/channel'
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filter as Record<string, unknown>)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const query = params.toString()
  return query ? `/channel?${query}` : '/channel'
}

export function formatCountWithUnit(value: unknown): string {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return '0'
  if (num >= 100_000_000) return `${trimDecimal(num / 100_000_000)}亿`
  if (num >= 10_000) return `${trimDecimal(num / 10_000)}万`
  return String(Math.floor(num))
}

function trimDecimal(value: number): string {
  return value.toFixed(value >= 100 ? 0 : 1).replace(/\.0$/, '')
}

function normalizeCanonicalPath(value?: string | null): string {
  const raw = text(value)
  if (!raw) return ''
  if (raw.startsWith('/')) return raw.startsWith('//') ? '' : raw
  try {
    const url = new URL(raw)
    return /^https?:$/.test(url.protocol) ? `${url.pathname}${url.search}` : ''
  } catch {
    return ''
  }
}

function isMovieSeoDetailPath(path: string): boolean {
  return /^\/movie\/(?!detail(?:\/|$)|rank(?:\/|$)|search(?:\/|$))[^/?#]+\/[^/?#]+(?:[?#]|$)?/.test(path)
}

function seoSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
