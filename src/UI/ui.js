import { initNotifications, showNotification } from './dom/notifications.js'
import { WorldLabel }                          from './world/WorldLabel.js'

const worldElements = []

export function initUI() {
  initNotifications()
}

export function updateUI(delta) {
  for (let i = worldElements.length - 1; i >= 0; i--) {
    const el = worldElements[i]
    el.update(delta)
    if (el.done) {
      el.destroy()
      worldElements.splice(i, 1)
    }
  }
}

export function spawnWorldLabel(text, position, opts) {
  const label = new WorldLabel(text, position, opts)
  worldElements.push(label)
  return label
}

export { showNotification }
