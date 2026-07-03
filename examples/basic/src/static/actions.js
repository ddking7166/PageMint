const actions = new Map()

export function registerAction(name, handler) {
  actions.set(name, handler)
}

document.addEventListener('click', async (event) => {
  const el = event.target.closest('[data-action]')
  if (!el) return

  const action = el.dataset.action
  const handler = actions.get(action)
  if (!handler) return

  event.preventDefault()
  const payload = el.dataset.payload ? JSON.parse(el.dataset.payload) : undefined
  await handler({ payload, el, event })
})

registerAction('demo.toast', ({ payload }) => {
  alert(payload.message)
})

registerAction('movie.favorite', ({ payload, el }) => {
  el.textContent = `已收藏 ${payload.title}`
  el.disabled = true
})
