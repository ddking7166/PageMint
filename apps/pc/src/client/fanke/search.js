import {
  movieDetailHref,
  readHistory,
  writeHistory,
} from './utils.js'

export function initSearch(form) {
  const input = form.querySelector('[data-search-input]')
  const popup = form.querySelector('[data-search-popup]')
  const smart = form.querySelector('[data-smart-results]')
  const historyHot = form.querySelector('[data-history-hot]')
  const clear = form.querySelector('[data-search-clear]')
  if (!input || !popup || !smart || !historyHot) return

  let requestId = 0

  async function smartSearch(value) {
    const keyword = value.trim()
    const id = ++requestId
    if (!keyword) {
      smart.classList.add('hidden')
      historyHot.classList.remove('hidden')
      smart.replaceChildren()
      return
    }

    const response = await fetch('/client-api/movie/smartSearch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ keywords: keyword }),
    }).catch(() => null)
    if (id !== requestId || !response) return
    const data = await response.json().catch(() => null)
    const items = data && data.status === 'y' && Array.isArray(data.data) ? data.data : []

    if (!items.length) {
      smart.classList.add('hidden')
      historyHot.classList.remove('hidden')
      smart.replaceChildren()
      return
    }

    smart.replaceChildren(...items.map((item) => {
      const name = String(item.name || item.movie_name || '')
      const release = String(item.release_at || '')
      const link = document.createElement('a')
      link.href = movieDetailHref(item)
      appendHighlightedText(link, name, keyword)
      if (release) link.append(document.createTextNode(` ${release}`))
      return link
    }))
    smart.classList.remove('hidden')
    historyHot.classList.add('hidden')
  }

  input.addEventListener('focus', () => {
    renderHistory(form)
    popup.classList.remove('hidden')
  })
  input.addEventListener('blur', () => {
    window.setTimeout(() => popup.classList.add('hidden'), 140)
  })
  input.addEventListener('input', () => {
    const value = input.value.slice(0, 40)
    if (input.value !== value) input.value = value
    void smartSearch(value)
  })
  form.addEventListener('submit', () => {
    const keyword = input.value.trim()
    if (keyword) writeHistory(keyword)
  })
  clear?.addEventListener('click', () => {
    localStorage.removeItem('keywords')
    renderHistory(form)
  })
}

function renderHistory(form) {
  const wrap = form.querySelector('[data-search-history]')
  const list = form.querySelector('[data-search-history-list]')
  if (!wrap || !list) return
  const items = readHistory()
  wrap.classList.toggle('hidden', items.length === 0)
  list.replaceChildren(...items.map((item) => {
    const link = document.createElement('a')
    link.href = `/channel?keywords=${encodeURIComponent(item)}`
    link.textContent = item
    return link
  }))
}

function appendHighlightedText(node, value, keyword) {
  const text = String(value || '')
  const term = String(keyword || '').trim()
  if (!term) {
    node.append(document.createTextNode(text))
    return
  }

  const lowerText = text.toLocaleLowerCase()
  const lowerTerm = term.toLocaleLowerCase()
  let cursor = 0

  while (cursor < text.length) {
    const index = lowerText.indexOf(lowerTerm, cursor)
    if (index === -1) {
      node.append(document.createTextNode(text.slice(cursor)))
      break
    }
    if (index > cursor) {
      node.append(document.createTextNode(text.slice(cursor, index)))
    }
    const span = document.createElement('span')
    span.className = 'highlight'
    span.textContent = text.slice(index, index + term.length)
    node.append(span)
    cursor = index + term.length
  }
}
