import * as THREE from 'three'
import { scene } from '../core.js'
import { buildChunkMesh, CHUNK_SIZE } from './chunkMesh.js'
import { WaterManager } from './water/waterManager.js'
import { WATER_LEVEL } from './terrainConfig.js'
export { WATER_LEVEL }

const LOAD_RADIUS      = 4
const UNLOAD_RADIUS    = 5
const BUILDS_PER_FRAME = 4

const chunks     = new Map()  // key -> { mesh, lod, cx, cz }
const buildQueue = []
let   queueDirty = false

const waterManager = new WaterManager(scene, WATER_LEVEL)

function key(cx, cz) { return `${cx},${cz}` }

function lodFor(dx, dz) {
  const d = Math.max(Math.abs(dx), Math.abs(dz))
  if (d <= 1) return 0
  if (d <= 2) return 1
  if (d <= 3) return 2
  return 3
}

function disposeChunk(k) {
  const chunk = chunks.get(k)
  if (!chunk) return
  scene.remove(chunk.mesh)
  chunk.mesh.geometry.dispose()
  chunks.delete(k)
}

export function initTerrain(sceneRef) {
  sceneRef.fog = new THREE.Fog(0xf07030, 200, LOAD_RADIUS * CHUNK_SIZE * 0.9)
}

export function dirtyAllChunks() {
  for (const k of [...chunks.keys()]) disposeChunk(k)
  buildQueue.length = 0
}

export function updateTerrain(playerPosition, time) {
  const pcx = Math.floor(playerPosition.x / CHUNK_SIZE)
  const pcz = Math.floor(playerPosition.z / CHUNK_SIZE)

  const needed = new Map()
  for (let dz = -LOAD_RADIUS; dz <= LOAD_RADIUS; dz++) {
    for (let dx = -LOAD_RADIUS; dx <= LOAD_RADIUS; dx++) {
      const cx = pcx + dx
      const cz = pcz + dz
      needed.set(key(cx, cz), { cx, cz, lod: lodFor(dx, dz) })
    }
  }

  for (const [k] of chunks) {
    if (!needed.has(k)) {
      const [cx, cz] = k.split(',').map(Number)
      if (Math.max(Math.abs(cx - pcx), Math.abs(cz - pcz)) > UNLOAD_RADIUS) {
        disposeChunk(k)
      }
    }
  }

  for (const [k, { cx, cz, lod }] of needed) {
    const existing = chunks.get(k)
    if (!existing) {
      buildQueue.push({ key: k, cx, cz, lod })
      queueDirty = true
    } else if (existing.lod !== lod) {
      disposeChunk(k)
      buildQueue.push({ key: k, cx, cz, lod })
      queueDirty = true
    }
  }

  if (queueDirty) {
    buildQueue.sort((a, b) => {
      const da = Math.max(Math.abs(a.cx - pcx), Math.abs(a.cz - pcz))
      const db = Math.max(Math.abs(b.cx - pcx), Math.abs(b.cz - pcz))
      return da - db
    })
    queueDirty = false
  }

  let built = 0
  while (buildQueue.length > 0 && built < BUILDS_PER_FRAME) {
    const item = buildQueue.shift()
    if (chunks.has(item.key)) continue
    const mesh = buildChunkMesh(item.cx, item.cz, item.lod)
    scene.add(mesh)
    chunks.set(item.key, { mesh, lod: item.lod, cx: item.cx, cz: item.cz })
    built++
  }

  waterManager.update(playerPosition, time)
}
