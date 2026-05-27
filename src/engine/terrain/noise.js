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
  if (y < -3)  return { r: 0.76, g: 0.70, b: 0.50 }  // sand
  if (y <  6)  return { r: 0.25, g: 0.52, b: 0.16 }  // grass
  if (y < 15)  return { r: 0.44, g: 0.36, b: 0.26 }  // rock
  return             { r: 0.90, g: 0.90, b: 0.95 }  // snow
}
