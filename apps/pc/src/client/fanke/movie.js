import { honoClientPost } from './api.js'
import { showToast } from './ui.js'
import {
  closest,
  escapeHtml,
  formatDisplayCount,
  hlsPlaybackMode,
  loadHlsApi,
  normalizeMoviePlayUrl,
  parseDisplayCount,
  queryValue,
} from './utils.js'

export function initMovieAutoplay(root = document) {
  const button = root.querySelector('[data-player-play]')
  if (!button || button.dataset.autoStarted === 'true') return
  button.dataset.autoStarted = 'true'
  window.setTimeout(() => {
    button.click()
  }, 120)
}

export function initMovieActions(root = document) {
  root.querySelectorAll('[data-movie-action]').forEach((button) => {
    if (button.dataset.actionBound === 'true') return
    button.dataset.actionBound = 'true'
    button.addEventListener('click', async () => {
      if (button.dataset.actionPending === 'true') return
      const action = button.dataset.movieAction
      const movieId = button.dataset.movieId || document.querySelector('.detail-page')?.dataset.movieId || ''
      if (!movieId) return
      const endpoint = action === 'favorite' ? 'movie/doFavorite' : 'movie/doLove'
      const countNode = button.querySelector('[data-action-count]')
      const previousActive = button.classList.contains('active')
      const previousCount = parseDisplayCount(countNode?.textContent)
      const nextActive = !previousActive
      const nextCount = previousCount + (nextActive ? 1 : -1)

      button.dataset.actionPending = 'true'
      updateMovieAction(button, nextActive, nextCount)
      const result = await honoClientPost(endpoint, { id: movieId }).catch(() => null)
      button.dataset.actionPending = 'false'

      if (!result || result.status !== 'y') {
        updateMovieAction(button, previousActive, previousCount)
        showToast(result?.error || '网络异常稍后再试!')
        return
      }

      const confirmedActive = result.data?.status !== 'n'
      if (confirmedActive !== nextActive) {
        updateMovieAction(button, confirmedActive, previousCount + (confirmedActive ? 1 : -1))
      }
    })
  })
}

export function initDetailPage(root = document) {
  const page = root.querySelector('.detail-page')
  if (!page || page.dataset.detailBound === 'true') return
  page.dataset.detailBound = 'true'

  const tabs = Array.from(page.querySelectorAll('[data-detail-tab]'))
  const panels = Array.from(page.querySelectorAll('[data-detail-panel]'))
  const commentList = page.querySelector('[data-comment-list]')
  const commentText = page.querySelector('[data-comment-text]')
  const commentCount = page.querySelector('[data-comment-count]')
  const commentSubmit = page.querySelector('[data-comment-submit]')
  let commentsLoaded = false
  let commentsLoading = false

  function activateTab(name) {
    tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.detailTab === name))
    panels.forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.detailPanel === name)
      panel.classList.toggle('hidden', panel.dataset.detailPanel !== name)
    })
    if (name === 'comment') void loadComments()
  }

  async function loadComments(force = false) {
    if (!commentList || commentsLoading || (commentsLoaded && !force)) return
    commentsLoading = true
    commentList.innerHTML = '<div class="comment-empty">加载中...</div>'
    const movieId = page.dataset.movieId || ''
    const result = await honoClientPost('comment/logs', { id: movieId, type: 'movie' }).catch(() => null)
    commentsLoading = false
    commentsLoaded = true
    if (!result || result.status !== 'y') {
      renderDetailComments(commentList, [], result?.error || '暂无评论')
      return
    }
    renderDetailComments(commentList, commentItemsFromResult(result))
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activateTab(tab.dataset.detailTab || 'info'))
  })

  commentText?.addEventListener('input', () => {
    if (commentCount) commentCount.textContent = `${commentText.value.length}/200`
  })

  commentSubmit?.addEventListener('click', async () => {
    const content = String(commentText?.value || '').trim()
    if (!content) {
      showToast('请输入评论内容!')
      return
    }
    const movieId = commentSubmit.dataset.movieId || page.dataset.movieId || ''
    commentSubmit.disabled = true
    commentSubmit.textContent = '发送中...'
    const result = await honoClientPost('comment/do', {
      id: movieId,
      type: 'movie',
      content,
    }).catch(() => null)
    commentSubmit.disabled = false
    commentSubmit.textContent = '发表评论'
    if (!result || result.status !== 'y') {
      showToast(result?.error || '网络异常,请稍后再试!')
      return
    }
    if (commentText) commentText.value = ''
    if (commentCount) commentCount.textContent = '0/200'
    showToast('评论成功')
    await loadComments(true)
  })

  page.querySelector('[data-sort-episodes]')?.addEventListener('click', () => {
    const grid = page.querySelector('[data-episode-grid]')
    if (!grid) return
    grid.append(...Array.from(grid.children).reverse())
    page.querySelector('[data-episode-link].active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })

  const morePanel = page.querySelector('[data-detail-more-panel]')
  page.querySelector('[data-detail-more]')?.addEventListener('click', () => {
    morePanel?.classList.remove('hidden')
  })
  page.querySelector('[data-detail-more-close]')?.addEventListener('click', () => {
    morePanel?.classList.add('hidden')
  })

  page.querySelectorAll('[data-recommend-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.recommendTab || 'guess'
      page.querySelectorAll('[data-recommend-tab]').forEach((item) => item.classList.toggle('active', item === tab))
      page.querySelectorAll('[data-recommend-panel]').forEach((panel) => {
        panel.classList.toggle('hidden', panel.dataset.recommendPanel !== name)
      })
    })
  })

  const shareDialog = page.querySelector('[data-detail-share-dialog]')
  const shareInput = page.querySelector('[data-share-url-input]')
  const errorDialog = page.querySelector('[data-detail-error-dialog]')
  const errorText = page.querySelector('[data-detail-error-text]')

  function closeDialogs() {
    shareDialog?.classList.add('hidden')
    errorDialog?.classList.add('hidden')
    document.body.classList.remove('dialog-open')
  }

  page.querySelector('[data-detail-share-open]')?.addEventListener('click', (event) => {
    const button = event.currentTarget
    const url = button.dataset.shareUrl || window.location.href
    if (shareInput) shareInput.value = url
    shareDialog?.classList.remove('hidden')
    document.body.classList.add('dialog-open')
  })

  page.querySelector('[data-share-copy]')?.addEventListener('click', async () => {
    const value = shareInput?.value || window.location.href
    let ok = false
    try {
      await navigator.clipboard.writeText(value)
      ok = true
    } catch {
      ok = false
    }
    closeDialogs()
    showToast(ok ? '复制成功，快去分享吧！' : value)
  })

  page.querySelector('[data-detail-error-open]')?.addEventListener('click', () => {
    if (errorText) errorText.value = ''
    errorDialog?.classList.remove('hidden')
    document.body.classList.add('dialog-open')
  })

  page.querySelector('[data-detail-error-submit]')?.addEventListener('click', () => {
    if (!String(errorText?.value || '').trim()) {
      showToast('内容不能为空！')
      return
    }
    closeDialogs()
    showToast('上报成功')
  })

  page.querySelectorAll('[data-detail-dialog-close]').forEach((button) => {
    button.addEventListener('click', closeDialogs)
  })
}

export function initMoviePlayerEvents() {
  if (document.documentElement.dataset.fankeMovieEventsBound === 'true') return
  document.documentElement.dataset.fankeMovieEventsBound = 'true'

  document.addEventListener('click', async (event) => {
    const button = closest(event.target, '[data-fetch-detail]')
    if (!button) return

    event.preventDefault()
    const id = button.dataset.fetchDetail
    const video = button.closest('[data-player-box]')?.querySelector('[data-player-video]')
    const linkId = button.dataset.linkId || video?.dataset.linkId || queryValue('link_id')
    setPlayerMessage('正在刷新播放地址...', 'loading')

    try {
      const data = await honoClientPost('movie/detail', {
        id,
        link_id: linkId || '',
        is_simple: 'y',
      })
      if (data.status === 'y' && button.matches('[data-player-play]')) {
        applyMoviePlayData(button, data.data)
        startPlayer(button)
      } else if (data.status !== 'y') {
        setPlayerMessage(`请求失败：${data.error || '未知错误'}`, 'error')
        if (button.matches('[data-player-play]')) startPlayer(button)
      }
    } catch (error) {
      setPlayerMessage(`请求失败：${error instanceof Error ? error.message : '未知错误'}`, 'error')
      if (button.matches('[data-player-play]')) {
        startPlayer(button)
      }
    }
  })

  document.addEventListener('click', async (event) => {
    const episode = closest(event.target, '[data-episode-link]')
    if (!episode) return

    event.preventDefault()
    const movieId = episode.dataset.movieId || document.querySelector('.detail-page')?.dataset.movieId || ''
    const linkId = episode.dataset.episodeLink || ''
    if (!movieId || !linkId) {
      window.location.href = episode.href
      return
    }

    syncEpisodeButtons(linkId)
    syncPlayerEpisodeLabel(episode.dataset.episodeName || '')
    setPlayerMessage('正在切换剧集...', 'loading')

    try {
      const data = await honoClientPost('movie/detail', {
        id: movieId,
        link_id: linkId,
        is_simple: 'y',
      })
      if (data.status !== 'y') {
        setPlayerMessage(`切换失败：${data.error || '未知错误'}`, 'error')
        return
      }

      applyMoviePlayData(episode, data.data)
      if (episode.href) window.history.pushState(null, '', episode.href)

      const video = document.querySelector('[data-player-video]')
      const box = video?.closest('[data-player-box]')
      if (video && box?.classList.contains('playing')) {
        void attachMovieVideo(video, video.dataset.src)
      } else {
        setPlayerMessage('剧集已切换，点击播放开始观看', 'ok')
      }
    } catch (error) {
      setPlayerMessage(`切换失败：${error instanceof Error ? error.message : '未知错误'}`, 'error')
    }
  })

  document.addEventListener('click', (event) => {
    const button = closest(event.target, '[data-player-line]')
    if (!button) return

    event.preventDefault()
    const lineId = button.dataset.playerLine || ''
    const src = normalizeMoviePlayUrl(button.dataset.playerSrc)
    document.querySelectorAll('[data-player-line]').forEach((item) => {
      item.classList.toggle('active', item === button)
    })
    try {
      if (lineId) localStorage.setItem('movieLine', lineId)
    } catch {
      // ignore storage errors
    }

    const video = document.querySelector('[data-player-video]')
    if (!video) return
    video.dataset.playLine = lineId
    if (src) video.dataset.src = src

    const box = video.closest('[data-player-box]')
    if (box?.classList.contains('playing')) {
      void attachMovieVideo(video, src)
    }
  })
}

function setPlayerMessage(message, state = '') {
  const result = document.getElementById('client-api-result')
  if (!result) return
  result.textContent = message
  result.dataset.state = state
}

function destroyMovieHls(video) {
  if (!video?._fankeHls) return
  try {
    video._fankeHls.destroy()
  } catch {
    // ignore player teardown errors
  }
  video._fankeHls = null
}

function tryMoviePlay(video) {
  return video.play().catch(() => {
    video.muted = true
    video.setAttribute('muted', '')
    return video.play().catch(() => {})
  })
}

async function attachMovieVideo(video, rawSrc) {
  const src = normalizeMoviePlayUrl(rawSrc)
  const box = video.closest('[data-player-box]')
  if (!src) {
    setPlayerMessage('当前视频无可用播放地址', 'error')
    return false
  }

  if (video.dataset.playerReady === 'true' && video.dataset.playerSrc === src) {
    box?.classList.add('playing')
    void tryMoviePlay(video)
    return true
  }

  destroyMovieHls(video)
  video.pause()
  video.removeAttribute('src')
  video.load()
  video.dataset.src = src
  video.dataset.playerSrc = src
  video.dataset.playerReady = 'false'
  box?.classList.add('playing')
  setPlayerMessage('正在加载播放地址...', 'loading')

  const mode = await hlsPlaybackMode(video, src)
  if (mode === 'unsupported') {
    setPlayerMessage('当前浏览器不支持该播放地址', 'error')
    return false
  }

  if (mode === 'hls.js') {
    const hlsApi = await loadHlsApi()
    const hls = hlsApi.create({ enableWorker: true })
    video._fankeHls = hls
    hls.loadSource(src)
    hls.attachMedia(video)
    hls.on(hlsApi.Events.MANIFEST_PARSED, () => {
      video.dataset.playerReady = 'true'
      setPlayerMessage('播放地址已加载', 'ok')
      void tryMoviePlay(video)
    })
    hls.on(hlsApi.Events.ERROR, (_, data) => {
      if (!data?.fatal) return
      if (data.type === hlsApi.ErrorTypes.MEDIA_ERROR && typeof hls.recoverMediaError === 'function') {
        hls.recoverMediaError()
        return
      }
      video.dataset.playerReady = 'false'
      setPlayerMessage('播放器加载失败，请切换线路或稍后重试', 'error')
    })
    return true
  }

  video.src = src
  video.dataset.playerReady = 'true'
  video.load()
  void tryMoviePlay(video).then(() => {
    setPlayerMessage('播放地址已加载', 'ok')
  })
  return true
}

function preferredMovieLine(fallback = '') {
  try {
    return localStorage.getItem('movieLine') || fallback
  } catch {
    return fallback
  }
}

function pickMoviePlayLink(playLinks, lineId) {
  const links = Array.isArray(playLinks) ? playLinks : []
  return links.find((item) => String(item?.id || '') === String(lineId || '')) || links[0] || null
}

function syncMovieLineButtons(playLinks) {
  const links = Array.isArray(playLinks) ? playLinks : []
  for (const line of links) {
    const id = String(line?.id || '')
    if (!id) continue
    const button = document.querySelector(`[data-player-line="${CSS.escape(id)}"]`)
    if (!button) continue
    button.dataset.playerSrc = normalizeMoviePlayUrl(line.m3u8_url || line.preview_m3u8_url || '')
  }
}

function selectedMovieEpisode(detail, fallbackLinkId = '') {
  const links = Array.isArray(detail?.links) ? detail.links : []
  return links.find((link) => String(link?.is_selected || '') === 'y') ||
    links.find((link) => String(link?.id || '') === String(fallbackLinkId || '')) ||
    null
}

function syncEpisodeButtons(linkId) {
  if (!linkId) return
  document.querySelectorAll('[data-episode-link]').forEach((item) => {
    item.classList.toggle('active', item.dataset.episodeLink === String(linkId))
  })
}

function syncPlayerEpisodeLabel(name) {
  const label = document.querySelector('[data-current-episode]')
  if (label && name) label.textContent = name
}

function applyMoviePlayData(source, detail) {
  const box = source?.closest?.('[data-player-box]') || document.querySelector('[data-player-box]')
  const video = box?.querySelector('[data-player-video]')
  if (!video || !detail || typeof detail !== 'object') return

  const currentLine = preferredMovieLine(video.dataset.playLine || '')
  const playLink = pickMoviePlayLink(detail.play_links, currentLine)
  const selectedEpisode = selectedMovieEpisode(detail, detail.link_id || video.dataset.linkId || '')
  const playUrl = normalizeMoviePlayUrl(
    playLink?.m3u8_url ||
      playLink?.preview_m3u8_url ||
      detail.m3u8_url ||
      detail.m3u8_url_source ||
      '',
  )
  if (playUrl) video.dataset.src = playUrl
  if (playLink?.id) video.dataset.playLine = String(playLink.id)
  const nextLinkId = String(detail.link_id || selectedEpisode?.id || '')
  if (nextLinkId) {
    video.dataset.linkId = nextLinkId
    document.querySelectorAll('[data-player-play]').forEach((item) => {
      item.dataset.linkId = nextLinkId
    })
    syncEpisodeButtons(nextLinkId)
  }
  syncPlayerEpisodeLabel(String(selectedEpisode?.name || ''))
  syncMovieLineButtons(detail.play_links)
}

function updateMovieAction(button, active, count) {
  button.classList.toggle('active', active)
  button.dataset.actionActive = active ? 'y' : 'n'
  const countNode = button.querySelector('[data-action-count]')
  if (countNode) countNode.textContent = formatDisplayCount(count)
}

function commentItemsFromResult(result) {
  const payload = result?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.list)) return payload.list
  if (Array.isArray(payload?.comments)) return payload.comments
  return []
}

function renderDetailComments(list, items, message = '') {
  if (!list) return
  if (!items.length) {
    list.innerHTML = `<div class="comment-empty">${escapeHtml(message || '暂无评论')}</div>`
    return
  }
  list.innerHTML = items.map((item) => {
    const name = String(item.nickname || item.user_name || item.from_uname || '游客')
    const content = String(item.content || item.text || '')
    const label = String(item.label || item.created_at || item.create_time || '')
    return `
      <div class="detail-comment-item">
        <div class="nickname">${escapeHtml(name)}</div>
        <div class="content">${escapeHtml(content)}</div>
        <div class="date">${escapeHtml(label)}</div>
      </div>
    `
  }).join('')
}

function startPlayer(button) {
  const box = button.closest('[data-player-box]')
  const video = box?.querySelector('[data-player-video]')
  const src = normalizeMoviePlayUrl(video?.dataset.src)
  if (!box || !video) return

  void attachMovieVideo(video, src)
}
