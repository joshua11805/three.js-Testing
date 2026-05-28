import { engineConfig, setOscWaveform } from './audio.js'

const WAVEFORMS = ['sawtooth', 'square', 'triangle', 'sine']

function row(label, min, max, step, key, fmt = v => v) {
  return { label, min, max, step, key, fmt }
}

const SLIDERS = [
  row('IDLE HZ',    20,  150,  1,    'idleHz',    v => `${v} Hz`),
  row('MAX HZ',     80,  500,  1,    'maxHz',     v => `${v} Hz`),
  row('IDLE VOL',   0,   0.3,  0.005,'idleVol',   v => v.toFixed(3)),
  row('MAX VOL',    0.1, 0.8,  0.005,'maxVol',    v => v.toFixed(3)),
  row('FILTER Q',   0.1, 10,   0.1,  'filterQ',   v => v.toFixed(1)),
  row('SMOOTH',     0.01,0.4,  0.01, 'smooth',    v => `${v.toFixed(2)}s`),
  row('LFO IDLE',   1,   20,   0.5,  'lfoIdleHz', v => `${v} Hz`),
  row('LFO MAX',    10,  120,  1,    'lfoMaxHz',  v => `${v} Hz`),
  row('LFO DEPTH',  0,   0.8,  0.01, 'lfoDepth',  v => v.toFixed(2)),
  row('GEARS',      1,   8,    1,    'gears',     v => `${v}`),
  row('RPM LOW',    0.05,0.5,  0.01, 'rpmLow',    v => v.toFixed(2)),
  row('RPM HIGH',   0.5, 1.0,  0.01, 'rpmHigh',   v => v.toFixed(2)),
]

export function initEngineSynthUI() {
  const panel = document.createElement('div')
  panel.id = 'synth-panel'

  const header = document.createElement('div')
  header.id = 'synth-header'
  header.textContent = 'ENGINE SYNTH'
  panel.appendChild(header)

  const body = document.createElement('div')
  body.id = 'synth-body'
  panel.appendChild(body)

  // ── Sliders ──────────────────────────────────────────────────────────────────
  for (const { label, min, max, step, key, fmt } of SLIDERS) {
    const r = document.createElement('div')
    r.className = 'synth-row'

    const lbl = document.createElement('span')
    lbl.className = 'synth-label'
    lbl.textContent = label

    const input = document.createElement('input')
    input.type  = 'range'
    input.min   = min
    input.max   = max
    input.step  = step
    input.value = engineConfig[key]

    const val = document.createElement('span')
    val.className = 'synth-val'
    val.textContent = fmt(engineConfig[key])

    input.addEventListener('input', () => {
      engineConfig[key] = parseFloat(input.value)
      val.textContent   = fmt(engineConfig[key])
    })

    r.append(lbl, input, val)
    body.appendChild(r)
  }

  // ── Waveform pickers ──────────────────────────────────────────────────────────
  for (const layer of [1, 2]) {
    const r = document.createElement('div')
    r.className = 'synth-row'

    const lbl = document.createElement('span')
    lbl.className = 'synth-label'
    lbl.textContent = `OSC ${layer}`
    r.appendChild(lbl)

    const grp = document.createElement('div')
    grp.className = 'synth-wave-group'

    let active = 'sawtooth'
    for (const wf of WAVEFORMS) {
      const btn = document.createElement('button')
      btn.className = 'synth-wave-btn' + (wf === active ? ' active' : '')
      btn.textContent = wf.slice(0, 3).toUpperCase()
      btn.title = wf
      btn.addEventListener('click', () => {
        grp.querySelectorAll('.synth-wave-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        setOscWaveform(layer, wf)
      })
      grp.appendChild(btn)
    }

    r.appendChild(grp)
    body.appendChild(r)
  }

  // ── Collapse toggle ───────────────────────────────────────────────────────────
  let collapsed = false
  header.addEventListener('click', () => {
    collapsed = !collapsed
    body.style.display = collapsed ? 'none' : 'flex'
    header.dataset.collapsed = collapsed
  })

  document.getElementById('ui').appendChild(panel)
}
