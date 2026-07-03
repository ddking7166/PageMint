import { fankeBrowserPost } from './api.js'
import { hlsPlaybackMode, loadHlsApi } from './utils.js'

export function initLivePage(root) {
  const player = root.querySelector('[data-live-player]')
  const video = root.querySelector('[data-live-video]')
  const mask = root.querySelector('[data-live-mask]')
  const lineButtons = Array.from(root.querySelectorAll('[data-live-line]'))
  let hls = null

  if (!player || !video || player.dataset.liveBound === 'true') return
  player.dataset.liveBound = 'true'

  function setMask(title, message, visible = true) {
    if (!mask) return
    mask.classList.toggle('hidden', !visible)
    const strong = mask.querySelector('strong')
    const paragraph = mask.querySelector('p')
    if (strong) strong.textContent = title || player.dataset.matchTitle || '直播'
    if (paragraph) paragraph.textContent = message || ''
  }

  function normalizePlayUrl(url) {
    if (!url) return ''
    if (/^https?:\/\//i.test(url)) return url
    return url.startsWith('/') ? url : `/${url}`
  }

  async function attachVideo(url) {
    if (hls) {
      hls.destroy()
      hls = null
    }
    video.pause()
    video.removeAttribute('src')
    video.load()

    if (!url) {
      setMask('', '当前线路暂无播放地址', true)
      return
    }

    setMask('', '正在连接直播线路', true)
    const mode = await hlsPlaybackMode(video, url)
    if (mode === 'native') {
      video.src = url
      void video.play().catch(() => {})
      return
    }
    if (mode === 'hls.js') {
      const hlsApi = await loadHlsApi()
      hls = hlsApi.create({ enableWorker: true })
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(hlsApi.Events.MANIFEST_PARSED, () => {
        void video.play().catch(() => {})
      })
      hls.on(hlsApi.Events.ERROR, (_, data) => {
        if (data?.fatal) setMask('', '播放器加载失败', true)
      })
      return
    }
    setMask('', '当前浏览器不支持该播放地址', true)
  }

  async function playLine(raw) {
    let line = null
    try {
      line = JSON.parse(raw || '{}')
    } catch {
      line = null
    }
    if (!line?.playable || !line.app_name || !line.stream_name) {
      setMask('', '当前赛事暂无可播放线路', true)
      return
    }

    setMask('', '正在连接直播线路', true)
    const result = await fankeBrowserPost('sportsLive/play', {
      app_name: line.app_name,
      stream_name: line.stream_name,
    }).catch(() => null)
    const payload = result?.data && typeof result.data === 'object' ? result.data : result
    const url = normalizePlayUrl(payload?.main_url || payload?.backup_url)
    if (!url) {
      setMask('', result?.error || '直播地址获取失败', true)
      return
    }
    await attachVideo(url)
  }

  video.addEventListener('canplay', () => setMask('', '', false))
  video.addEventListener('playing', () => setMask('', '', false))
  video.addEventListener('error', () => setMask('', '播放器加载失败', true))

  lineButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) return
      lineButtons.forEach((item) => item.classList.toggle('active', item === button))
      void playLine(button.dataset.liveLine)
    })
  })

  if (player.dataset.initialLine) {
    void playLine(player.dataset.initialLine)
  }
}
