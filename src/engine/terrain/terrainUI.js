import { terrainParams } from './noise.js'
import { dirtyAllChunks } from './chunkManager.js'

const CONTROLS = [
  { key: 'scale',       label: 'Scale',       min: 0.001, max: 0.02,  step: 0.0005, decimals: 4 },
  { key: 'amplitude',   label: 'Amplitude',   min: 1,     max: 80,    step: 1,      decimals: 0 },
  { key: 'octaves',     label: 'Octaves',     min: 1,     max: 8,     step: 1,      decimals: 0 },
  { key: 'persistence', label: 'Persistence', min: 0.1,   max: 0.9,   step: 0.05,   decimals: 2 },
  { key: 'lacunarity',  label: 'Lacunarity',  min: 1.5,   max: 4.0,   step: 0.1,    decimals: 1 },
  { key: 'step',        label: 'Step',        min: 0,     max: 10,    step: 0.5,    decimals: 1 },
]

export function initTerrainUI() {
  const panel = document.createElement('div')
  panel.style.cssText = [
    'position:fixed', 'top:48px', 'right:12px', 'z-index:9999',
    'background:rgba(0,0,0,0.78)', 'color:#eee',
    'font:12px/1.6 monospace', 'padding:10px 14px',
    'border-radius:6px', 'min-width:240px', 'user-select:none',
  ].join(';')

  const title = document.createElement('div')
  title.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px'
  title.innerHTML = '<span style="font-weight:bold;letter-spacing:1px">TERRAIN</span>'

  const toggle = document.createElement('button')
  toggle.textContent = 'hide'
  toggle.style.cssText = 'background:none;border:1px solid #888;color:#ccc;cursor:pointer;padding:1px 6px;font:11px monospace;border-radius:3px'
  title.appendChild(toggle)
  panel.appendChild(title)

  const body = document.createElement('div')
  panel.appendChild(body)

  const valueLabels = {}

  for (const ctrl of CONTROLS) {
    const row = document.createElement('div')
    row.style.cssText = 'display:grid;grid-template-columns:90px 1fr 46px;align-items:center;gap:6px;margin-bottom:4px'

    const label = document.createElement('span')
    label.textContent = ctrl.label
    label.style.color = '#aaa'

    const slider = document.createElement('input')
    slider.type  = 'range'
    slider.min   = ctrl.min
    slider.max   = ctrl.max
    slider.step  = ctrl.step
    slider.value = terrainParams[ctrl.key]
    slider.style.cssText = 'width:100%;accent-color:#4af;cursor:pointer'

    const val = document.createElement('span')
    val.textContent = Number(terrainParams[ctrl.key]).toFixed(ctrl.decimals)
    val.style.cssText = 'text-align:right;color:#4af'
    valueLabels[ctrl.key] = val

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value)
      terrainParams[ctrl.key] = ctrl.key === 'octaves' ? Math.round(v) : v
      val.textContent = terrainParams[ctrl.key].toFixed(ctrl.decimals)
      dirtyAllChunks()
    })

    row.append(label, slider, val)
    body.appendChild(row)
  }

  // Collapse / expand
  let collapsed = false
  toggle.addEventListener('click', () => {
    collapsed = !collapsed
    body.style.display = collapsed ? 'none' : ''
    toggle.textContent = collapsed ? 'show' : 'hide'
  })

  document.body.appendChild(panel)
}
