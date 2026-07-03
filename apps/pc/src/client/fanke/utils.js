let hlsModulePromise = null

export async function loadHlsApi() {
  const Hls = await loadHls()
  return {
    create(options) {
      return new Hls(options)
    },
    Events: Hls.Events,
    ErrorTypes: Hls.ErrorTypes,
  }
}

export function closest(target, selector) {
  return target instanceof Element ? target.closest(selector) : null
}

export function readHistory() {
  try {
    return JSON.parse(localStorage.getItem('keywords') || '[]')
  } catch {
    return []
  }
}

export function writeHistory(keyword) {
  const next = readHistory().filter((item) => item !== keyword)
  next.unshift(keyword)
  localStorage.setItem('keywords', JSON.stringify(next.slice(0, 10)))
}

export function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[2]) : ''
}

export function setCookie(name, value, days) {
  let expires = ''
  if (days) {
    const date = new Date()
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
    expires = `; expires=${date.toUTCString()}`
  }
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/`
}

export function queryValue(name) {
  try {
    return new URLSearchParams(window.location.search).get(name) || ''
  } catch {
    return ''
  }
}

export function deviceId() {
  const fromQuery = queryValue('_uid')
  if (fromQuery) {
    setCookie('_did', fromQuery, 980)
    return fromQuery
  }
  const current = getCookie('_did')
  if (current) return current
  const next = randomString()
  setCookie('_did', next, 980)
  return next
}

export function formatTime(date = new Date()) {
  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    ' ',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
    ':',
    pad(date.getSeconds()),
  ].join('')
}

export function movieDetailHref(item) {
  const canonical = String(item.canonical_path || '')
  if (/^\/movie\/(?!detail(?:\/|$)|rank(?:\/|$)|search(?:\/|$))/.test(canonical)) return canonical
  const id = encodeURIComponent(String(item.id || item.movie_id || ''))
  return id ? `/movie/detail/${id}` : '#'
}

export function historyDetailHref(item) {
  const href = movieDetailHref(item)
  const linkId = String(item.link_id || '')
  return linkId && href !== '#' ? `${href}?link_id=${encodeURIComponent(linkId)}` : href
}

export function imageUrl(value, fallback = '/h5/images/placeholder/placeholder5.png') {
  const raw = String(value || '').trim()
  if (!raw) return fallback
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw
  if (/^(assets|h5|common|load)\//i.test(raw)) return `/${raw}`
  return raw.startsWith('/') ? raw : `/${raw}`
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function parseDisplayCount(value) {
  const raw = String(value || '').trim()
  if (!raw) return 0
  const num = Number(raw.replace(/[^\d.]/g, ''))
  if (!Number.isFinite(num)) return 0
  if (raw.includes('亿')) return Math.round(num * 100000000)
  if (raw.includes('万')) return Math.round(num * 10000)
  return Math.round(num)
}

export function formatDisplayCount(value) {
  const num = Math.max(0, Number(value) || 0)
  if (num >= 100000000) return `${trimDecimal(num / 100000000)}亿`
  if (num >= 10000) return `${trimDecimal(num / 10000)}万`
  return String(Math.floor(num))
}

export function normalizeEndpoint(endpoint) {
  return String(endpoint || '')
    .replace(/^https?:\/\/[^/]+\/ysapi\/?/i, '')
    .replace(/^\/+/, '')
    .replace(/^ysapi\/+/, '')
}

export function normalizeMoviePlayUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^(blob:|data:)/i.test(raw)) return raw

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw)
      if (url.origin === 'https://fktv.me' && url.pathname.startsWith('/ysapi/')) {
        return `${url.pathname}${url.search}${url.hash}`
      }
      if (
        /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) ||
        window.location.hostname.endsWith('.local') ||
        window.location.hostname.endsWith('.cc')
      ) {
        if (url.pathname.startsWith('/ysapi/m3u8/')) {
          return `${url.pathname}${url.search}${url.hash}`
        }
      }
    } catch {
      return raw
    }
    return raw
  }

  if (raw.startsWith('//')) return `${window.location.protocol}${raw}`
  return raw.startsWith('/') ? raw : `/${raw.replace(/^\/+/, '')}`
}

export async function hlsPlaybackMode(video, url) {
  if (!/\.m3u8(?:[?#]|$)/i.test(url)) return 'native'
  const nativeSupported = nativeHlsSupported(video)
  if (isAppleBrowser() && nativeSupported) return 'native'
  if (await hlsJsSupported()) return 'hls.js'
  if (nativeSupported) return 'native'
  return 'unsupported'
}

async function loadHls() {
  hlsModulePromise ??= import('hls.js').then((module) => module.default)
  return hlsModulePromise
}

async function hlsJsSupported() {
  try {
    const Hls = await loadHls()
    return Hls.isSupported()
  } catch {
    return false
  }
}

function randomString(length = 32) {
  const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz102345678'
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return out
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function trimDecimal(value) {
  return value.toFixed(value >= 100 ? 0 : 1).replace(/\.0$/, '')
}

function isChromiumBasedBrowser() {
  const vendor = navigator.vendor || ''
  if (/Google Inc\.|Opera Software|Microsoft/i.test(vendor)) return true
  if ('chrome' in window) return true
  return /Chrome|Chromium|CriOS|Edg|OPR|Brave/i.test(navigator.userAgent || '')
}

function isAppleBrowser() {
  if (isChromiumBasedBrowser()) return false
  const ua = navigator.userAgent || ''
  return /iPhone|iPad|iPod/i.test(ua) || (/Safari/i.test(ua) && !/Android/i.test(ua))
}

function nativeHlsSupported(video) {
  return ['application/vnd.apple.mpegurl', 'application/x-mpegURL'].some((type) => {
    const result = video.canPlayType(type)
    return result === 'probably' || result === 'maybe'
  })
}
