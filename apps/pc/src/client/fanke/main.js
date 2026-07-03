import { initHeaderHistory, initHeaderUser, initSwitchAccountDialog } from './header.js'
import { initBncImages, initImageFallbacks } from './image.js'
import { initLivePage } from './live.js'
import {
  initDetailPage,
  initMovieActions,
  initMovieAutoplay,
  initMoviePlayerEvents,
} from './movie.js'
import { initSearch } from './search.js'
import {
  initBanner,
  initCommonEvents,
  initHorizontalRow,
} from './ui.js'

export function initFankeClient(root = document) {
  initBncImages(root)
  initImageFallbacks(root)
  root.querySelectorAll('[data-banner-root]').forEach(initBanner)
  root.querySelectorAll('[data-hscroll-row]').forEach(initHorizontalRow)
  root.querySelectorAll('[data-search-form]').forEach(initSearch)
  root.querySelectorAll('[data-live-page]').forEach(initLivePage)
  initHeaderUser(root)
  initHeaderHistory(root)
  initMovieActions(root)
  initDetailPage(root)
  initMovieAutoplay(root)
  initMoviePlayerEvents()
  initCommonEvents()
  initSwitchAccountDialog()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initFankeClient())
} else {
  initFankeClient()
}
