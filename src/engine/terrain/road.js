// Infinite procedural road — smooth sweeping curves, streaming generation.
// Road points are stored in a spatial hash for O(1) surfaceHeight lookups.
// Chunks are generated ahead of the player and pruned behind to bound memory.

import { terrainHeight } from './noise.js'

// ─── Parameters ───────────────────────────────────────────────────────────────
const STEP          = 0.5     // world units between consecutive road points
const CHUNK_SIZE    = 1000    // steps generated per batch (500 world units)
const LOOKAHEAD     = 16000   // steps kept ahead of player  (8 000 world units)
const LOOKBEHIND    = 4000    // steps kept behind player    (2 000 world units)
const SMOOTH_WINDOW = 120     // moving-average half-window  (60 world units/side)
const BUCKET_SIZE   = 6       // spatial hash cell size (world units)

export const ROAD_WIDTH = 16
const HALF_W     = ROAD_WIDTH / 2
const ROAD_COLOR = { r: 0.01, g: 0.05, b: 0.08 }

// Curve tuning — long sweeping arcs, no sharp corners
const CURVE_INTERVAL = 300    // steps between direction updates (~150 world units)
const MAX_ANG_VEL    = 0.005  // rad / step  (min turn radius ≈ 100 world units)
const ANG_VEL_DAMP   = 0.998  // per-step decay — road naturally straightens

// ─── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────
function makeRng(seed) {
  let s = seed >>> 0
  return () => {
    s += 0x6D2B79F5
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Spatial hash ─────────────────────────────────────────────────────────────
// Bucket format: interleaved [x, z, y, stepIndex, …] (4 values per point).
const buckets = new Map()

function bkey(x, z) {
  return `${Math.floor(x / BUCKET_SIZE)},${Math.floor(z / BUCKET_SIZE)}`
}

function insertPt(x, z, y, step) {
  const key = bkey(x, z)
  let b = buckets.get(key)
  if (!b) { b = []; buckets.set(key, b) }
  b.push(x, z, y, step)
}

function removePt(x, z) {
  const key = bkey(x, z)
  const b = buckets.get(key)
  if (!b) return
  for (let i = 0; i < b.length; i += 4) {
    if (b[i] === x && b[i + 1] === z) { b.splice(i, 4); break }
  }
  if (b.length === 0) buckets.delete(key)
}

function nearestRoad(wx, wz) {
  const bx = Math.floor(wx / BUCKET_SIZE)
  const bz = Math.floor(wz / BUCKET_SIZE)
  let minD2 = Infinity, ny = 0, ns = 0
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const b = buckets.get(`${bx + dx},${bz + dz}`)
      if (!b) continue
      for (let i = 0; i < b.length; i += 4) {
        const d2 = (wx - b[i]) ** 2 + (wz - b[i + 1]) ** 2
        if (d2 < minD2) { minD2 = d2; ny = b[i + 2]; ns = b[i + 3] }
      }
    }
  }
  return { dist: Math.sqrt(minD2), y: ny, step: ns }
}

// ─── Frontier state ───────────────────────────────────────────────────────────
// Start heading Math.PI so the road extends in -Z, matching the car's default
// forward direction (car heading=0 → forward = (0,0,-1)).
let fX = 0, fZ = 0, fH = Math.PI, fAV = 0
let totalSteps = 0
const rng = makeRng(0xA3F1)

// Lookbehind buffer: last SMOOTH_WINDOW raw terrain heights for cross-chunk
// height continuity.
const rawTail = new Float32Array(SMOOTH_WINDOW)

// Chunk list for pruning: { endStep: number, xz: number[] }
const chunks = []

// ─── Height smoothing ─────────────────────────────────────────────────────────
// Prepend `prefix` (previous raw heights) so the moving average at the start of
// `rawChunk` has correct context.  Returns smoothed heights for rawChunk only.
function smoothChunk(prefix, rawChunk) {
  const pn = prefix.length, cn = rawChunk.length, n = pn + cn
  const all = new Float32Array(n)
  all.set(prefix)
  for (let i = 0; i < cn; i++) all[pn + i] = rawChunk[i]

  const half = SMOOTH_WINDOW >> 1
  let sum = 0, cnt = 0
  for (let j = 0; j <= Math.min(half, n - 1); j++) { sum += all[j]; cnt++ }

  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const add = i + half, rem = i - half - 1
    if (add < n)  { sum += all[add]; cnt++ }
    if (rem >= 0) { sum -= all[rem]; cnt-- }
    out[i] = sum / cnt
  }
  return out.subarray(pn)
}

// ─── Chunk generation ─────────────────────────────────────────────────────────
function generateChunk() {
  const startStep = totalSteps
  // Use a regular Array (float64) so removePt comparisons stay exact.
  const xz  = []
  const raw  = new Float32Array(CHUNK_SIZE)

  let x = fX, z = fZ, h = fH, av = fAV

  for (let i = 0; i < CHUNK_SIZE; i++) {
    xz.push(x, z)
    raw[i] = terrainHeight(x, z)

    if ((startStep + i) % CURVE_INTERVAL === 0) {
      const target = (rng() - 0.5) * MAX_ANG_VEL * 2
      av = av * 0.5 + target * 0.5
    }
    av *= ANG_VEL_DAMP
    h  += av
    x  += Math.sin(h) * STEP
    z  += Math.cos(h) * STEP
  }

  fX = x; fZ = z; fH = h; fAV = av
  totalSteps += CHUNK_SIZE

  const ys = smoothChunk(rawTail, raw)

  // Roll rawTail forward with the last SMOOTH_WINDOW raw values.
  if (CHUNK_SIZE >= SMOOTH_WINDOW) {
    for (let i = 0; i < SMOOTH_WINDOW; i++) rawTail[i] = raw[CHUNK_SIZE - SMOOTH_WINDOW + i]
  } else {
    rawTail.copyWithin(0, SMOOTH_WINDOW - CHUNK_SIZE)
    for (let i = 0; i < CHUNK_SIZE; i++) rawTail[SMOOTH_WINDOW - CHUNK_SIZE + i] = raw[i]
  }

  for (let i = 0; i < CHUNK_SIZE; i++) {
    insertPt(xz[i * 2], xz[i * 2 + 1], ys[i], startStep + i)
  }

  chunks.push({ endStep: startStep + CHUNK_SIZE - 1, xz })
}

// ─── Pruning ──────────────────────────────────────────────────────────────────
function pruneOldChunks(playerStep) {
  const threshold = playerStep - LOOKBEHIND
  while (chunks.length > 0 && chunks[0].endStep < threshold) {
    const { xz } = chunks.shift()
    for (let i = 0; i < xz.length; i += 2) removePt(xz[i], xz[i + 1])
  }
}

// ─── Initialise — generate enough road before the first frame ─────────────────
{
  const initChunks = Math.ceil(LOOKAHEAD / CHUNK_SIZE)
  for (let c = 0; c < initChunks; c++) generateChunk()
}

// ─── Public update (call once per frame, before terrain chunk generation) ──────
export function updateRoad(playerX, playerZ) {
  const { step: playerStep } = nearestRoad(playerX, playerZ)
  while (totalSteps < playerStep + LOOKAHEAD) generateChunk()
  pruneOldChunks(playerStep)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

// ─── Public surface API (unchanged signatures) ────────────────────────────────
export function surfaceHeight(wx, wz) {
  const rawY = terrainHeight(wx, wz)
  const { dist, y: roadY } = nearestRoad(wx, wz)
  const rf = Math.max(0, 1 - smoothstep(HALF_W - 1.0, HALF_W + 0.5, dist))
  if (rf === 0) return rawY
  return rawY + (Math.max(roadY, rawY) - rawY) * rf
}

export function applyRoad(wx, wz, terrainY, terrainC, terrainHeightFn) {
  const { dist, y: roadY } = nearestRoad(wx, wz)
  const rf = Math.max(0, 1 - smoothstep(HALF_W - 1.0, HALF_W + 0.5, dist))
  if (rf === 0) return { y: terrainY, r: terrainC.r, g: terrainC.g, b: terrainC.b, road: 0 }
  const clampedY = Math.max(roadY, terrainY)
  return {
    y    : terrainY + (clampedY         - terrainY)   * rf,
    r    : terrainC.r + (ROAD_COLOR.r - terrainC.r) * rf,
    g    : terrainC.g + (ROAD_COLOR.g - terrainC.g) * rf,
    b    : terrainC.b + (ROAD_COLOR.b - terrainC.b) * rf,
    road : rf,
  }
}
