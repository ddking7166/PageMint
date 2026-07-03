import CryptoJS from 'crypto-js'

import {
  deviceId,
  formatTime,
  getCookie,
  normalizeEndpoint,
} from './utils.js'

export async function fankeBrowserPost(endpoint, data = {}) {
  const context = {
    deviceId: deviceId(),
    token: getCookie('_token'),
    domain: window.location.host,
    referer: document.referrer || '',
    user_agent: navigator.userAgent || '',
    shareCode: getCookie('_invite'),
    channel: getCookie('_channel'),
    ip: '',
    data,
  }
  const response = await fetch(`/ysapi/${normalizeEndpoint(endpoint)}`, {
    method: 'POST',
    headers: {
      version: '1.0',
      deviceType: 'pc',
      time: formatTime(),
      shareCode: context.shareCode || '',
      channel: context.channel || '',
      ip: '',
      'Content-Type': 'application/octet-stream',
    },
    body: encryptClientPayload(JSON.stringify(context)),
  })
  const raw = await response.text()
  if (!response.ok) return { status: 'n', error: `${response.status} ${response.statusText}` }
  try {
    return JSON.parse(decodeClientPayload(raw))
  } catch {
    return { status: 'n', error: 'API 响应解析失败' }
  }
}

export async function honoClientPost(endpoint, data = {}) {
  deviceId()
  const response = await fetch(`/client-api/${normalizeEndpoint(endpoint)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'same-origin',
  })
  const parsed = await response.json().catch(() => null)
  if (!response.ok) {
    return parsed && typeof parsed === 'object'
      ? parsed
      : { status: 'n', error: `${response.status} ${response.statusText}` }
  }
  return parsed || { status: 'n', error: 'API 响应解析失败' }
}

function clientApiKey() {
  return document.body?.dataset.apiKey || ''
}

function clientCryptKey() {
  const key = clientApiKey()
  if (!key) throw new Error('client api encrypt unavailable')
  return CryptoJS.enc.Utf8.parse(key)
}

function encryptClientPayload(value) {
  return CryptoJS.AES.encrypt(value, clientCryptKey(), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  }).toString()
}

function decryptClientPayload(value) {
  return CryptoJS.AES.decrypt(value, clientCryptKey(), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  }).toString(CryptoJS.enc.Utf8)
}

function decodeClientPayload(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed
  return decryptClientPayload(trimmed)
}
