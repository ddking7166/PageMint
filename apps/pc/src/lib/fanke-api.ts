import crypto from 'node:crypto'

import { loadAppConfig } from '../config/app-config.js'
import { asArray } from './records.js'

import type { AnyRecord } from './records.js'

export type DeviceType = 'pc' | 'h5'

export interface FankeRequestContext {
  deviceType: DeviceType
  deviceId: string
  token?: string
  domain: string
  referer: string
  userAgent: string
  shareCode: string
  channel: string
  ip: string
}

export class FankeApiError extends Error {
  readonly endpoint: string
  readonly errorCode?: number | string

  constructor(endpoint: string, message: string, errorCode?: number | string) {
    super(message)
    this.name = 'FankeApiError'
    this.endpoint = endpoint
    this.errorCode = errorCode
  }
}

export interface FankeApiEnvelope<T = unknown> {
  status?: string
  error?: string
  errorCode?: string | number
  data?: T
  [key: string]: unknown
}

export function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/^\/+/, '').replace(/^ysapi\/+/, '')
}

export function serverApiBaseUrl(): string {
  const { fanke } = loadAppConfig().thirdParty
  const value = fanke.serverApiBaseUrl || fanke.publicApiBaseUrl
  if (!value || value.startsWith('/')) {
    throw new Error('请配置 PAGEMINT_FANKE_SERVER_API_BASE_URL 为后端 ysapi 绝对地址')
  }
  return value.replace(/\/+$/, '')
}

export function apiKey(): string {
  const value = loadAppConfig().thirdParty.fanke.publicApiKey
  if (!value || value.length !== 16) {
    throw new Error('PAGEMINT_PUBLIC_FANKE_API_KEY 必须配置为 16 字节 AES-128 key')
  }
  return value
}

export function endpointUrl(endpoint: string): string {
  return `${serverApiBaseUrl()}/${normalizeEndpoint(endpoint)}`
}

export function encryptBase64(value: string, key = apiKey()): string {
  const cipher = crypto.createCipheriv('aes-128-ecb', Buffer.from(key), null)
  cipher.setAutoPadding(true)
  return Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]).toString('base64')
}

export function decryptBase64(value: string, key = apiKey()): string {
  const decipher = crypto.createDecipheriv('aes-128-ecb', Buffer.from(key), null)
  decipher.setAutoPadding(true)
  return Buffer.concat([
    decipher.update(Buffer.from(value, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

export function createFankeContextFromRequest(
  request: Request,
  deviceType: DeviceType = 'pc',
): FankeRequestContext {
  const headers = request.headers
  const cookie = parseCookie(headers.get('cookie') ?? '')
  const userAgent = headers.get('user-agent') ?? 'PageMint PC'
  const host = firstHeader(headers.get('x-forwarded-host')) || firstHeader(headers.get('host'))

  return {
    deviceType,
    deviceId: cookie._did || 'no-device',
    token: cookie._token || '',
    domain: host,
    referer: headers.get('referer') ?? '',
    userAgent,
    shareCode: cookie._invite || '',
    channel: cookie._channel || '',
    ip: firstHeader(headers.get('x-forwarded-for')) || firstHeader(headers.get('x-real-ip')),
  }
}

export async function fankePost<T = unknown>(
  endpoint: string,
  data: AnyRecord = {},
  context: FankeRequestContext,
): Promise<T> {
  const parsed = await fankePostEnvelope<T>(endpoint, data, context)
  if (parsed.data === undefined || parsed.data === null || parsed.data === '') {
    return true as T
  }

  return parsed.data
}

export async function fankePostEnvelope<T = unknown>(
  endpoint: string,
  data: AnyRecord = {},
  context: FankeRequestContext,
): Promise<FankeApiEnvelope<T>> {
  const normalizedEndpoint = normalizeEndpoint(endpoint)
  const payload: AnyRecord = {
    deviceId: context.deviceId || 'no-device',
    domain: context.domain,
    referer: context.referer,
    user_agent: context.userAgent,
    data,
  }
  if (context.token) payload.token = context.token

  const response = await fetch(endpointUrl(normalizedEndpoint), {
    method: 'POST',
    headers: {
      version: '1.0',
      deviceType: context.deviceType,
      time: formatTime(),
      shareCode: context.shareCode,
      channel: context.channel,
      ip: context.ip,
      'content-type': 'application/octet-stream',
    },
    body: encryptBase64(JSON.stringify(payload)),
  })

  if (!response.ok) {
    throw new FankeApiError(normalizedEndpoint, `${response.status} ${response.statusText}`)
  }

  const raw = await response.text()
  if (!raw) {
    throw new FankeApiError(normalizedEndpoint, 'API 返回空响应')
  }

  let parsed: FankeApiEnvelope<T>
  try {
    parsed = JSON.parse(decodeResponse(raw))
  } catch (error) {
    throw new FankeApiError(
      normalizedEndpoint,
      `API 响应解析失败：${error instanceof Error ? error.message : '未知错误'}`,
    )
  }

  if (parsed.status !== 'y') {
    throw new FankeApiError(normalizedEndpoint, parsed.error || '网络错误，请稍后再试', parsed.errorCode)
  }

  return parsed
}

export async function safeFankePost<T>(
  label: string,
  fallback: T,
  endpoint: string,
  data: AnyRecord,
  context: FankeRequestContext,
): Promise<T> {
  try {
    return await fankePost<T>(endpoint, data, context)
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    console.warn(`[pc] ${label} failed: ${message}`)
    return fallback
  }
}

export async function getSystemInfo(context: FankeRequestContext): Promise<AnyRecord> {
  const info = await safeFankePost<AnyRecord>('system/info', emptySystemInfo(), 'system/info', {}, context)
  return {
    ...info,
    private_domains: decryptJsonArray(info.private_domains),
    proxy_domains: decryptJsonArray(info.proxy_domains),
    web_domains: decryptJsonArray(info.web_domains),
    main_menus: asArray(info.main_menus),
    categories: asArray(info.categories),
    movie_hot_items: asArray(info.movie_hot_items),
    movie_position: info.movie_position && typeof info.movie_position === 'object' ? info.movie_position : {},
  }
}

export function getHomeData(context: FankeRequestContext): Promise<AnyRecord> {
  return safeFankePost('movie/home', emptyHomeData(), 'movie/home', {}, context)
}

export function getChannelData(code: string, context: FankeRequestContext): Promise<AnyRecord> {
  return safeFankePost('movie/channel', emptyChannelData(), 'movie/channel', { code }, context)
}

export function getMovieDetail(
  id: string,
  context: FankeRequestContext,
  query: AnyRecord = {},
): Promise<AnyRecord> {
  return safeFankePost(
    'movie/detail',
    {},
    'movie/detail',
    { id, link_id: query.link_id || '', is_simple: query.is_switch ? 'y' : 'n' },
    context,
  )
}

export function searchMovies(query: AnyRecord, context: FankeRequestContext): Promise<AnyRecord> {
  return safeFankePost('movie/search', {}, 'movie/search', { page_size: 32, order: 'new', ...query }, context)
}

export function getMovieRank(code: string, context: FankeRequestContext): Promise<AnyRecord[]> {
  return safeFankePost('movie/rank', [], 'movie/rank', { code }, context)
}

export function getMovieFilter(query: AnyRecord, context: FankeRequestContext): Promise<AnyRecord[]> {
  return safeFankePost('movie/filter', [], 'movie/filter', query, context)
}

export function getMovieCategories(context: FankeRequestContext): Promise<AnyRecord[]> {
  return safeFankePost('movie/categories', [], 'movie/categories', {}, context)
}

export function getMovieTags(context: FankeRequestContext): Promise<AnyRecord[]> {
  return safeFankePost('movie/tags', [], 'movie/tags', {}, context)
}

export function getSportsLiveList(query: AnyRecord, context: FankeRequestContext): Promise<AnyRecord> {
  return safeFankePost(
    'sportsLive/search',
    {},
    'sportsLive/search',
    { page: 1, page_size: 60, ...query },
    context,
  )
}

export function getRankList(page: number, context: FankeRequestContext): Promise<AnyRecord> {
  return safeFankePost('post/rankList', {}, 'post/rankList', { page }, context)
}

export function getRankDetail(id: string, context: FankeRequestContext): Promise<AnyRecord> {
  return safeFankePost('post/rankDetail', {}, 'post/rankDetail', { id }, context)
}

export function searchPosts(query: AnyRecord, page: number, context: FankeRequestContext): Promise<AnyRecord> {
  return safeFankePost('post/search', {}, 'post/search', { ...query, page }, context)
}

export function getPostDetail(id: string, context: FankeRequestContext): Promise<AnyRecord> {
  return safeFankePost('post/detail', {}, 'post/detail', { id }, context)
}

export function getArticleDetail(id: string, context: FankeRequestContext): Promise<AnyRecord> {
  return safeFankePost('system/articleDetail', {}, 'system/articleDetail', { id }, context)
}

export function getComments(id: string, type: 'movie' | 'post', context: FankeRequestContext): Promise<AnyRecord[]> {
  return safeFankePost('comment/logs', [], 'comment/logs', { id, type }, context)
}

export function getUserInfo(context: FankeRequestContext): Promise<AnyRecord> {
  return safeFankePost('user/info', emptyUserInfo(), 'user/info', {}, context)
}

export function getUserMovieList(
  section: 'favorite' | 'history',
  query: AnyRecord,
  context: FankeRequestContext,
): Promise<AnyRecord> {
  const endpoint = section === 'favorite' ? 'movie/favorite' : 'movie/history'
  return safeFankePost(endpoint, {}, endpoint, { page: 1, page_size: 28, ...query }, context)
}

export function emptySystemInfo(): AnyRecord {
  return {
    site_name: '凡客影视',
    site_title: '凡客影视',
    description: 'PageMint PC 版',
    keywords: '',
    private_domains: [],
    proxy_domains: [],
    web_domains: [],
    main_menus: [],
    categories: [],
    movie_hot_items: [],
    movie_position: {},
  }
}

export function emptyHomeData(): AnyRecord {
  return {
    banner: [],
    new_items: [],
    guess_you_like: [],
    hot_play: [],
    playlists: [],
    main_block: [],
    other_block: [],
    rank_updated_items: [],
  }
}

export function emptyChannelData(): AnyRecord {
  return {
    banner: [],
    block: [],
    rank_updated_items: [],
  }
}

export function emptyUserInfo(): AnyRecord {
  return {
    img: '',
    nickname: '游客',
    username: '游客',
    user_id: '',
    is_vip: 'n',
    group_name: '',
    group_end_time: '',
    share_link: '',
  }
}

function decodeResponse(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.includes('"status"')) {
    return trimmed
  }
  return decryptBase64(trimmed)
}

function decryptJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'string') return []
  try {
    const decoded = decryptBase64(value)
    const parsed = JSON.parse(decoded)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseCookie(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (!key) continue
    cookies[key] = decodeURIComponent(rest.join('=') || '')
  }
  return cookies
}

function firstHeader(value: string | null): string {
  return (value ?? '').split(',')[0]?.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '') ?? ''
}

function formatTime(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
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
