let container

export function initNotifications() {
  container = document.createElement('div')
  container.id = 'notifications'
  document.getElementById('ui').appendChild(container)
}

export function showNotification(text, duration = 3000) {
  const el = document.createElement('div')
  el.className = 'notification'
  el.textContent = text
  container.appendChild(el)

  requestAnimationFrame(() => el.classList.add('show'))

  setTimeout(() => {
    el.classList.remove('show')
    el.addEventListener('transitionend', () => el.remove(), { once: true })
  }, duration)
}
