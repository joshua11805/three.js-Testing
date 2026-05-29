import { engineConfig, setOscWaveform, setMusicVolume } from './audio.js'
import { UIPanel } from './ui/UIPanel.js'

const WAVEFORMS = ['sawtooth', 'square', 'triangle', 'sine']

const SLIDERS = [
  { label: 'IDLE HZ',   key: 'idleHz',    min: 20,   max: 150, step: 1,     fmt: v => `${v} Hz`          },
  { label: 'MAX HZ',    key: 'maxHz',     min: 80,   max: 500, step: 1,     fmt: v => `${v} Hz`          },
  { label: 'IDLE VOL',  key: 'idleVol',   min: 0,    max: 0.3, step: 0.005, fmt: v => v.toFixed(3)       },
  { label: 'MAX VOL',   key: 'maxVol',    min: 0.1,  max: 0.8, step: 0.005, fmt: v => v.toFixed(3)       },
  { label: 'FILTER Q',  key: 'filterQ',   min: 0.1,  max: 10,  step: 0.1,   fmt: v => v.toFixed(1)       },
  { label: 'SMOOTH',    key: 'smooth',    min: 0.01, max: 0.4, step: 0.01,  fmt: v => `${v.toFixed(2)}s` },
  { label: 'LFO IDLE',  key: 'lfoIdleHz', min: 1,    max: 20,  step: 0.5,   fmt: v => `${v} Hz`          },
  { label: 'LFO MAX',   key: 'lfoMaxHz',  min: 10,   max: 120, step: 1,     fmt: v => `${v} Hz`          },
  { label: 'LFO DEPTH', key: 'lfoDepth',  min: 0,    max: 0.8, step: 0.01,  fmt: v => v.toFixed(2)       },
  { label: 'GEARS',     key: 'gears',     min: 1,    max: 8,   step: 1,     fmt: v => `${v}`             },
  { label: 'RPM LOW',   key: 'rpmLow',    min: 0.05, max: 0.5, step: 0.01,  fmt: v => v.toFixed(2)       },
  { label: 'RPM HIGH',  key: 'rpmHigh',   min: 0.5,  max: 1.0, step: 0.01,  fmt: v => v.toFixed(2)       },
]

export function initEngineSynthUI() {
  const panel = new UIPanel({ title: 'AUDIO', top: '24px', left: '10px' })

  panel.addSlider('BGM VOL', { min: 0, max: 1, step: 0.01, value: 0.4, fmt: v => v.toFixed(2) }, v => {
    setMusicVolume(v)
  })

  for (const { label, key, min, max, step, fmt } of SLIDERS) {
    panel.addSlider(label, { min, max, step, value: engineConfig[key], fmt }, v => {
      engineConfig[key] = v
    })
  }

  const waveOptions = WAVEFORMS.map(wf => ({ label: wf.slice(0, 3).toUpperCase(), value: wf }))
  for (const layer of [1, 2]) {
    panel.addButtons(`OSC ${layer}`, waveOptions, 'sawtooth', wf => setOscWaveform(layer, wf))
  }
}
