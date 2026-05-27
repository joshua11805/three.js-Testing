import Stats from 'stats.js'
import { renderer } from './core.js'

let stats = null
let infoEl = null

export function initDebug() {
  // Disable auto-reset so stats accumulate across all EffectComposer passes.
  // We reset manually at the start of each frame instead.
  renderer.info.autoReset = false

  stats = new Stats()
  stats.showPanel(0) // 0=FPS, 1=MS per frame, 2=MB — click the panel to cycle
  document.body.appendChild(stats.dom)

  infoEl = document.createElement('div')
  infoEl.style.cssText = [
    'position:fixed', 'top:0', 'left:80px', 'z-index:9999',
    'background:rgba(0,0,0,0.75)', 'color:#0f0',
    'font:9px/1.6 monospace', 'padding:4px 8px', 'pointer-events:none',
    'white-space:pre',
  ].join(';')
  document.body.appendChild(infoEl)
}

// Call at the START of each tick (before updates + render).
export function debugBegin() {
  renderer.info.reset()
  stats?.begin()
}

// Call at the END of each tick (after render). Updates the renderer.info panel.
export function debugEnd() {
  stats?.end()
  if (!infoEl) return
  const r = renderer.info.render
  const m = renderer.info.memory
  infoEl.textContent =
    `draw calls  ${r.calls}\n` +
    `triangles   ${r.triangles.toLocaleString()}\n` +
    `geometries  ${m.geometries}\n` +
    `textures    ${m.textures}`
}
