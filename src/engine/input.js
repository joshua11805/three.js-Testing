const keys = {}
const PREVENT_DEFAULTS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

window.addEventListener('keydown', e => {
  keys[e.code] = true
  if (PREVENT_DEFAULTS.has(e.code)) e.preventDefault()
})
window.addEventListener('keyup', e => { keys[e.code] = false })

export function isPressed(code) {
  return !!keys[code]
}
