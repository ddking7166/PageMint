import { honoClientPost } from './api.js'
import { initBncImages, initImageFallbacks } from './image.js'
import {
  closest,
  escapeHtml,
  historyDetailHref,
  imageUrl,
} from './utils.js'

export function initHeaderUser(root = document) {
  const header = root.querySelector('[data-header-user]')
  if (!header || header.dataset.userLoaded === 'true') return
  header.dataset.userLoaded = 'true'

  const applyUser = (user) => {
    if (!user || typeof user !== 'object') return
    const avatar = imageUrl(user.img, '/h5/images/placeholder/placeholder1.png')
    const name = String(user.nickname || '游客')
    const number = String(user.user_id || user.id || user.username || '游客')
    header.querySelectorAll('[data-header-avatar], [data-header-avatar-large]').forEach((img) => {
      img.src = avatar
      img.removeAttribute('data-bnc-decrypting')
      img.removeAttribute('data-bnc-decrypted')
      img.removeAttribute('data-bnc-failed')
    })
    const nameNode = header.querySelector('[data-header-name]')
    const numberNode = header.querySelector('[data-header-number]')
    if (nameNode) nameNode.textContent = name
    if (numberNode) numberNode.textContent = number
    initBncImages(header)
    initImageFallbacks(header)
  }

  void honoClientPost('user/info', {}).then((result) => {
    if (result?.status === 'y') applyUser(result.data)
  }).catch(() => {})
}

export function initHeaderHistory(root = document) {
  const header = root.querySelector('[data-header-history]')
  if (!header || header.dataset.historyBound === 'true') return
  header.dataset.historyBound = 'true'
  const list = header.querySelector('[data-history-list]')
  const clear = header.querySelector('[data-history-clear]')
  let loaded = false
  let loading = false
  let items = []

  function render(message = '') {
    if (!list) return
    if (loading && !loaded) {
      list.innerHTML = '<div class="header-empty">加载中...</div>'
      return
    }
    if (!items.length) {
      list.innerHTML = `<div class="header-empty"><img src="/h5/images/empty.png" alt="" /><span>${escapeHtml(message || '暂无相关记录')}</span></div>`
      return
    }
    list.innerHTML = `
      <div class="header-history-items">
        ${items.map((item) => {
          const name = String(item.name || item.movie_name || '未命名影片')
          const subtitle = String(item.child_title || item.category || item.categories || '')
          const date = String(item.date_label || item.updated_at || item.update_time || '')
          return `
            <a href="${escapeHtml(historyDetailHref(item))}" class="header-history-item" title="${escapeHtml(name)}">
              <img src="${escapeHtml(imageUrl(item.img_x || item.img_y || item.img))}" alt="" />
              <span>
                <strong>${escapeHtml(name)}</strong>
                <em>${escapeHtml(subtitle)}</em>
                <small>${escapeHtml(date)}</small>
              </span>
            </a>
          `
        }).join('')}
        <a class="header-history-more" href="/user/history">查看更多</a>
      </div>
    `
    initBncImages(list)
    initImageFallbacks(list)
  }

  async function load(force = false) {
    if (loading || (loaded && !force)) return
    loading = true
    render()
    const result = await honoClientPost('movie/history', { page: 1 }).catch(() => null)
    loading = false
    loaded = true
    if (!result || result.status !== 'y') {
      items = []
      render(result?.error || '请登录后访问观看记录')
      return
    }
    const data = result.data
    items = (Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.list) ? data.list : []).slice(0, 5)
    render()
  }

  const triggerLoad = () => {
    void load()
  }
  header.addEventListener('mouseenter', triggerLoad)
  header.addEventListener('pointerenter', triggerLoad)
  header.querySelector('[data-history-trigger]')?.addEventListener('focus', triggerLoad)
  clear?.addEventListener('click', async (event) => {
    event.preventDefault()
    if (loading) return
    loading = true
    const result = await honoClientPost('movie/delHistory', { ids: 'all' }).catch(() => null)
    loading = false
    if (!result || result.status !== 'y') {
      render(result?.error || '清除失败')
      return
    }
    items = []
    loaded = true
    render()
  })
  window.setTimeout(() => {
    void load()
  }, 600)
}

export function initSwitchAccountDialog() {
  if (document.documentElement.dataset.fankeSwitchAccountBound === 'true') return
  document.documentElement.dataset.fankeSwitchAccountBound = 'true'

  let dialog = null
  let tab = 'login'

  function getDialog() {
    if (dialog) return dialog
    dialog = createSwitchAccountDialog()
    dialog.addEventListener('click', (event) => {
      const tabButton = closest(event.target, '[data-switch-tab]')
      if (tabButton) {
        setTab(tabButton.dataset.switchTab === 'register' ? 'register' : 'login')
        return
      }

      if (closest(event.target, '[data-switch-close]')) {
        close()
      }
    })
    const form = dialog.querySelector('[data-switch-form]')
    form?.addEventListener('submit', (event) => {
      event.preventDefault()
      void submit(form)
    })
    return dialog
  }

  function setTab(next) {
    tab = next
    const current = getDialog()
    current.querySelectorAll('[data-switch-tab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.switchTab === tab)
    })
    const repassword = current.querySelector('input[name="repassword"]')
    const submit = current.querySelector('.switch-submit')
    repassword?.classList.toggle('hidden', tab !== 'register')
    if (submit) submit.textContent = tab === 'login' ? '立即登录' : '确认注册'
    setMessage('')
  }

  function setMessage(message) {
    const node = getDialog().querySelector('[data-switch-message]')
    if (node) node.textContent = message
  }

  function open() {
    getDialog().classList.remove('hidden')
    document.body.classList.add('dialog-open')
    setTab(tab)
    window.setTimeout(() => {
      getDialog().querySelector('input[name="account"]')?.focus()
    }, 0)
  }

  function close() {
    getDialog().classList.add('hidden')
    document.body.classList.remove('dialog-open')
  }

  async function submit(form) {
    const account = String(form.elements.account?.value || '').trim()
    const password = String(form.elements.password?.value || '')
    const repassword = String(form.elements.repassword?.value || '')
    const submitButton = form.querySelector('.switch-submit')

    if (!account) {
      setMessage('请输入帐号！')
      return
    }
    if (!password) {
      setMessage('请输入密码！')
      return
    }
    if (tab === 'register' && !repassword) {
      setMessage('请再次输入密码！')
      return
    }
    if (tab === 'register' && repassword !== password) {
      setMessage('两次密码不一样！')
      return
    }

    if (submitButton) {
      submitButton.disabled = true
      submitButton.textContent = '处理中...'
    }
    setMessage('')

    try {
      const result = normalizeClientApiResult(await honoClientPost('user/findByAccount', {
        account_name: account,
        account_password: password,
        type: tab,
      }))
      if (result.ok) {
        window.location.reload()
        return
      }
      setMessage(result.message)
    } catch {
      setMessage('网络错误,请稍后再试!')
    } finally {
      if (submitButton) {
        submitButton.disabled = false
        submitButton.textContent = tab === 'login' ? '立即登录' : '确认注册'
      }
    }
  }

  document.addEventListener('click', (event) => {
    const switchButton = closest(event.target, '[data-switch-account]')
    if (!switchButton) return
    event.preventDefault()
    open()
  })
}

function createSwitchAccountDialog() {
  const dialog = document.createElement('div')
  dialog.className = 'switch-account-dialog hidden'
  dialog.dataset.switchDialog = 'true'
  dialog.innerHTML = `
    <div class="switch-account-backdrop" data-switch-close></div>
    <div class="switch-account-panel" role="dialog" aria-modal="true" aria-label="切换帐号">
      <div class="switch-tabs" role="tablist">
        <button type="button" class="active" data-switch-tab="login">账号登录</button>
        <button type="button" data-switch-tab="register">账号注册</button>
      </div>
      <form data-switch-form>
        <input type="text" name="account" placeholder="请输入账号/手机号" autocomplete="username" />
        <input type="password" name="password" placeholder="请输入登录密码" autocomplete="current-password" />
        <input class="hidden" type="password" name="repassword" placeholder="再次输入登录密码" autocomplete="new-password" />
        <p class="switch-message" data-switch-message></p>
        <button type="submit" class="switch-submit">立即登录</button>
        <button type="button" class="switch-close" data-switch-close>关闭</button>
      </form>
    </div>
  `
  document.body.appendChild(dialog)
  return dialog
}

function normalizeClientApiResult(data) {
  if (!data || typeof data !== 'object') return { ok: false, message: '网络错误,请稍后再试!' }
  if (data.status === 'n') return { ok: false, message: data.error || '网络错误,请稍后再试!' }
  if (data.status !== 'y') return { ok: false, message: data.error || '网络错误,请稍后再试!' }
  if (data.data && typeof data.data === 'object' && data.data.status === 'n') {
    return { ok: false, message: data.data.error || '网络错误,请稍后再试!' }
  }
  return { ok: true, message: '' }
}
