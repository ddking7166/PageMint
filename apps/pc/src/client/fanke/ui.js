import { closest } from './utils.js'

export function initBanner(root) {
  const slides = Array.from(root.querySelectorAll('[data-banner-slide]'))
  const tabs = Array.from(root.querySelectorAll('[data-banner-index]'))
  if (slides.length < 2) return

  let active = 0
  let timer = 0

  function setActive(index) {
    active = ((index % slides.length) + slides.length) % slides.length
    slides.forEach((slide, i) => slide.classList.toggle('active', i === active))
    tabs.forEach((tab, i) => tab.classList.toggle('active', i === active))
  }

  function start() {
    stop()
    timer = window.setInterval(() => setActive(active + 1), 3500)
  }

  function stop() {
    if (timer) window.clearInterval(timer)
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('mouseenter', () => setActive(index))
    tab.addEventListener('focus', () => setActive(index))
  })
  root.addEventListener('mouseenter', stop)
  root.addEventListener('mouseleave', start)
  start()
}

export function initHorizontalRow(row) {
  const scroller = row.querySelector('[data-hscroll-scroller]')
  const prev = row.querySelector('[data-hscroll-prev]')
  const next = row.querySelector('[data-hscroll-next]')
  if (!scroller || !prev || !next) return

  function sync() {
    const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
    prev.style.visibility = scroller.scrollLeft > 4 ? 'visible' : 'hidden'
    next.style.visibility = scroller.scrollLeft < max - 4 ? 'visible' : 'hidden'
  }

  prev.addEventListener('click', () => {
    scroller.scrollBy({ left: -scroller.clientWidth * 0.85, behavior: 'smooth' })
  })
  next.addEventListener('click', () => {
    scroller.scrollBy({ left: scroller.clientWidth * 0.85, behavior: 'smooth' })
  })
  scroller.addEventListener('scroll', sync, { passive: true })
  window.addEventListener('resize', sync)
  window.setTimeout(sync, 100)
  window.setTimeout(sync, 500)
}

export function initCommonEvents() {
  if (document.documentElement.dataset.fankeCommonEventsBound === 'true') return
  document.documentElement.dataset.fankeCommonEventsBound = 'true'

  document.addEventListener('click', (event) => {
    const button = closest(event.target, '[data-back-to-top]')
    if (!button) return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  document.addEventListener('click', async (event) => {
    const copyTarget = closest(event.target, '[data-copy-text]')
    if (copyTarget) {
      event.preventDefault()
      const text = copyTarget.dataset.copyText || ''
      let ok = false
      try {
        await navigator.clipboard.writeText(text)
        ok = true
      } catch {
        ok = false
      }
      showToast(ok ? '已复制' : '复制失败')
    }
  })
}

export function showToast(message) {
  let toast = document.querySelector('[data-copy-toast]')
  if (!toast) {
    toast = document.createElement('div')
    toast.className = 'copy-toast'
    toast.dataset.copyToast = 'true'
    document.body.appendChild(toast)
  }
  toast.textContent = message
  window.clearTimeout(showToast.timer)
  showToast.timer = window.setTimeout(() => {
    toast?.remove()
  }, 1800)
}
