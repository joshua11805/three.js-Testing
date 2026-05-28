import { createNoise2D } from 'simplex-noise'

const noise2D = createNoise2D()
export const terrainParams = {
  scale:       0.004,
  amplitude:   25,
  octaves:     5,
  persistence: 0.45,
  lacunarity:  2.1,
  step:        0,    // 0 = smooth, > 0 = quantised terracing
}

export function terrainHeight(x, z) {
  const { scale, amplitude, octaves, persistence, lacunarity, step } = terrainParams
  let value = 0, amp = 1, freq = 1, maxAmp = 0
  for (let i = 0; i < octaves; i++) {
    value  += noise2D(x * scale * freq, z * scale * freq) * amp
    maxAmp += amp
    amp    *= persistence
    freq   *= lacunarity
  }
  const raw = (value / maxAmp) * amplitude
  return step > 0 ? Math.round(raw / step) * step : raw
}

export function terrainColor(y) {
  // Dark base for neon aesthetic — slight height variation adds depth perception
  const t = Math.max(0, Math.min(1, (y + 25) / 50))
  return {
    r: 0.02 + t * 0.03,
    g: 0.01 + t * 0.02,
    b: 0.06 + t * 0.07,
  }
}
