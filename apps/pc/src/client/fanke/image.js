import CryptoJS from 'crypto-js'

const bncCache = new Map()
const bncInflight = new Map()

export function initBncImages(root = document) {
  const images = Array.from(root.querySelectorAll('img[src*=".bnc"]'))
  images.forEach((img) => {
    const src = img.getAttribute('src')
    if (!src || !isBncImageUrl(src) || img.dataset.bncDecrypting === 'true') return
    img.dataset.bncDecrypting = 'true'
    void fetchDecryptedBncImage(src)
      .then((dataUrl) => {
        img.src = dataUrl
        img.dataset.bncDecrypted = 'true'
      })
      .catch(() => {
        img.dataset.bncFailed = 'true'
      })
  })
}

export function initImageFallbacks(root = document) {
  const images = Array.from(root.querySelectorAll('img[data-fallback-src]'))
  images.forEach((img) => {
    const fallback = img.dataset.fallbackSrc
    if (!fallback || img.dataset.fallbackBound === 'true') return
    img.dataset.fallbackBound = 'true'
    const applyFallback = () => {
      if (img.src !== fallback) img.src = fallback
    }
    img.addEventListener('error', applyFallback)
    if (img.complete && img.naturalWidth === 0) applyFallback()
  })
}

function isBncImageUrl(value) {
  return /\.bnc(?:\?|$)/i.test(String(value || ''))
}

function u8arrayToWordArray(u8arr) {
  const words = []
  for (let i = 0; i < u8arr.length; i += 1) {
    words[i >>> 2] |= (u8arr[i] & 0xff) << (24 - (i % 4) * 8)
  }
  return CryptoJS.lib.WordArray.create(words, u8arr.length)
}

async function fetchDecryptedBncImage(url) {
  if (bncCache.has(url)) return bncCache.get(url)
  if (bncInflight.has(url)) return bncInflight.get(url)

  const task = (async () => {
    const key = document.body?.dataset.bncImageKey || ''
    if (!key) throw new Error('bnc decrypt unavailable')
    const response = await fetch(url, { method: 'GET', credentials: 'omit' })
    if (!response.ok) throw new Error(`bnc fetch failed: ${response.status}`)
    const buffer = await response.arrayBuffer()
    const wordArray = u8arrayToWordArray(new Uint8Array(buffer))
    const lkey = CryptoJS.enc.Latin1.parse(key)
    const b64data = wordArray.toString(CryptoJS.enc.Base64)
    const decrypted = CryptoJS.AES.decrypt(b64data, lkey, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    })
    const dataUrl = `data:image/png;base64,${decrypted.toString(CryptoJS.enc.Base64)}`
    bncCache.set(url, dataUrl)
    bncInflight.delete(url)
    return dataUrl
  })().catch((error) => {
    bncInflight.delete(url)
    throw error
  })

  bncInflight.set(url, task)
  return task
}
