import { terrainParams } from './noise.js'
import { dirtyAllChunks } from './chunkManager.js'
import { UIPanel } from '../ui/UIPanel.js'

const CONTROLS = [
  { key: 'scale',       label: 'Scale',       min: 0.001, max: 0.02,  step: 0.0005, decimals: 4 },
  { key: 'amplitude',   label: 'Amplitude',   min: 1,     max: 80,    step: 1,      decimals: 0 },
  { key: 'octaves',     label: 'Octaves',     min: 1,     max: 8,     step: 1,      decimals: 0 },
  { key: 'persistence', label: 'Persistence', min: 0.1,   max: 0.9,   step: 0.05,   decimals: 2 },
  { key: 'lacunarity',  label: 'Lacunarity',  min: 1.5,   max: 4.0,   step: 0.1,    decimals: 1 },
  { key: 'step',        label: 'Step',        min: 0,     max: 10,    step: 0.5,    decimals: 1 },
]

export function initTerrainUI() {
  const panel = new UIPanel({ title: 'TERRAIN', top: '24px', right: '12px' })

  for (const { key, label, min, max, step, decimals } of CONTROLS) {
    panel.addSlider(label, { min, max, step, value: terrainParams[key], decimals }, v => {
      terrainParams[key] = key === 'octaves' ? Math.round(v) : v
      dirtyAllChunks()
    })
  }
}
