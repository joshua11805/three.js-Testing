import * as THREE from 'three'
import { scene } from '../core.js'
import { buildChunkMesh, CHUNK_SIZE, terrainMaterial, LOD_SEGMENTS } from './chunkMesh.js'
// import { WaterManager } from './water/waterManager.js'
import { WATER_LEVEL } from './terrainConfig.js'
export { WATER_LEVEL }

const FORWARD_DISTANCE = 4
const SIDE_DISTANCE    = 2
const BACK_DISTANCE    = 1
const SCAN_RADIUS      = Math.max(FORWARD_DISTANCE, SIDE_DISTANCE, BACK_DISTANCE)
const UNLOAD_RADIUS    = SCAN_RADIUS + 1
const BUILDS_PER_FRAME = 8
const ANIM_DURATION    = 1.0
const REVEAL_RADIUS    = 32  // skip animation for chunks the player is already on top of

const chunks     = new Map()  // key -> { mesh, lod, cx, cz, animUniforms, animElapsed, revealed }
const buildQueue = []
let   queueDirty = false

// const waterManager = new WaterManager(scene, WATER_LEVEL)

function key(cx, cz) { return `${cx},${cz}` }

function lodFor(dx, dz) {
  const d = Math.max(Math.abs(dx), Math.abs(dz))
  if (d <= 1) return 0
  if (d <= 2) return 1
  if (d <= 3) return 2
  return 3
}

function segmentsForLod(lod) {
  return LOD_SEGMENTS[Math.min(lod, LOD_SEGMENTS.length - 1)]
}

// Distance from world point (px, pz) to the nearest edge of chunk (cx, cz).
// Returns 0 when the point is inside the chunk.
function distToChunkEdge(px, pz, cx, cz) {
  const x0 = cx * CHUNK_SIZE, x1 = x0 + CHUNK_SIZE
  const z0 = cz * CHUNK_SIZE, z1 = z0 + CHUNK_SIZE
  const dx = Math.max(x0 - px, 0, px - x1)
  const dz = Math.max(z0 - pz, 0, pz - z1)
  return Math.sqrt(dx * dx + dz * dz)
}

function disposeChunk(k) {
  const chunk = chunks.get(k)
  if (!chunk) return
  scene.remove(chunk.mesh)
  chunk.mesh.geometry.dispose()
  if (chunk.animUniforms) chunk.mesh.material.dispose()
  chunks.delete(k)
}

export function initTerrain(sceneRef) {
  const fogFar  = FORWARD_DISTANCE * CHUNK_SIZE * 0.9
  const fogNear = fogFar * 0.75
  sceneRef.fog = new THREE.Fog(0xffffff, fogNear, fogFar)
}

export function dirtyAllChunks() {
  for (const k of [...chunks.keys()]) disposeChunk(k)
  buildQueue.length = 0
}

export function updateTerrain(playerPosition, time, heading, delta) {
  const pcx = Math.floor(playerPosition.x / CHUNK_SIZE)
  const pcz = Math.floor(playerPosition.z / CHUNK_SIZE)

  // Heading-rotated axes (car.js convention: fwd = -sin/−cos)
  const fwdX = -Math.sin(heading), fwdZ = -Math.cos(heading)
  const rgtX =  Math.cos(heading), rgtZ = -Math.sin(heading)

  const needed = new Map()
  for (let dz = -SCAN_RADIUS; dz <= SCAN_RADIUS; dz++) {
    for (let dx = -SCAN_RADIUS; dx <= SCAN_RADIUS; dx++) {
      const fProj = dx * fwdX + dz * fwdZ   // component along heading
      const sProj = dx * rgtX + dz * rgtZ   // component perpendicular to heading
      if (fProj < -BACK_DISTANCE || fProj > FORWARD_DISTANCE) continue
      if (Math.abs(sProj) > SIDE_DISTANCE) continue
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
    } else if (segmentsForLod(lod) !== segmentsForLod(existing.lod)) {
      // Only rebuild if the actual mesh resolution would change
      disposeChunk(k)
      buildQueue.push({ key: k, cx, cz, lod })
      queueDirty = true
    } else {
      existing.lod = lod  // keep stored lod current without rebuilding
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
    const { mesh, animUniforms } = buildChunkMesh(item.cx, item.cz, item.lod)

    if (distToChunkEdge(playerPosition.x, playerPosition.z, item.cx, item.cz) <= REVEAL_RADIUS) {
      // Very close: skip animation, use shared material directly
      const mat = mesh.material
      mesh.material = terrainMaterial
      mat.dispose()
      scene.add(mesh)
      chunks.set(item.key, { mesh, lod: item.lod, cx: item.cx, cz: item.cz, animUniforms: null, animElapsed: 0, revealed: true })
    } else {
      // Far away: add to scene immediately so it's visible, animate in
      scene.add(mesh)
      chunks.set(item.key, { mesh, lod: item.lod, cx: item.cx, cz: item.cz, animUniforms, animElapsed: 0, revealed: true })
    }
    built++
  }

  // Advance chunk appear animations
  for (const chunk of chunks.values()) {
    if (!chunk.animUniforms) continue
    chunk.animElapsed += delta
    const t = Math.min(chunk.animElapsed / ANIM_DURATION, 1.0)
    chunk.animUniforms.uProgress.value = t
    if (t >= 1.0) {
      const oldMat = chunk.mesh.material
      chunk.mesh.material = terrainMaterial
      oldMat.dispose()
      chunk.animUniforms = null
    }
  }

  // waterManager.update(playerPosition, time)
}
