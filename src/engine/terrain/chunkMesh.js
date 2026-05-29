import * as THREE from 'three'
import { terrainHeight } from './noise.js'
import { applyRoad } from './road.js'

export const CHUNK_SIZE = 32
export const LOD_SEGMENTS = [16, 16, 16, 16]
const SEGMENT_VAR = 4
const VERTEX_JITTER = 0.7  // XZ offset per grid corner — keep < step * 0.4 (step=2 → max safe ≈ 0.8)

// ─── shared pulse uniforms ────────────────────────────────────────────────────
// uTime:  total elapsed seconds, drives oscillation frequency
// uPulse: 0..1 gameplay scalar — controls both speed and intensity of the pulse
export const pulseUniforms = {
  uTime:  { value: 0 },
  uPulse: { value: 0 },
}

// ─── neon edge + pulse shader ─────────────────────────────────────────────────
const neonEdgeSrc = `
{
  float _ed   = min(vBary.x, min(vBary.y, vBary.z));
  float _line = 1.0 - smoothstep(0.0,  0.05, _ed);
  float _glow = 1.0 - smoothstep(0.0,  0.22, _ed);
  vec3 _edgeCol = mix(vec3(0.0, 0.5, 0.45),  vec3(1.0, 0.1, 0.55),  vRoad);
  vec3 _glowCol = mix(vec3(0.1, 0.35, 1.0),  vec3(0.7, 0.05, 0.35), vRoad);
  totalEmissiveRadiance += _edgeCol * _line * 2.5
                         + _glowCol * _glow * 0.45;

  float _pSpeed = 1.0 + uPulse * 8.0;
  float _wave   = sin(uTime * _pSpeed) * 0.5 + 0.5;
  vec3  _pulseCol = mix(vec3(0.02, 0.05, 0.12), vec3(1.0, 0.15, 0.55), _wave);
  totalEmissiveRadiance += _pulseCol * uPulse * 1.5;
}
`

// Shared injection helper used by both the static and animated materials.
function injectNeon(shader) {
  Object.assign(shader.uniforms, pulseUniforms)

  shader.vertexShader =
    'attribute vec3 aBary;\nattribute float aRoad;\nvarying vec3 vBary;\nvarying float vRoad;\n' +
    shader.vertexShader
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    vBary = aBary;
    vRoad = aRoad;`
  )

  shader.fragmentShader =
    'varying vec3 vBary;\nvarying float vRoad;\nuniform float uTime;\nuniform float uPulse;\n' +
    shader.fragmentShader
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <emissivemap_fragment>',
    `#include <emissivemap_fragment>\n${neonEdgeSrc}`
  )
}

// ─── shared static material (used after animation completes) ─────────────────
export const terrainMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 1.0,
  metalness: 0.0,
  flatShading: true,
})
terrainMaterial.onBeforeCompile = injectNeon
terrainMaterial.customProgramCacheKey = () => 'terrain-neon'

// ─── per-chunk animated material ─────────────────────────────────────────────
function makeAnimMaterial() {
  const animUniforms = { uProgress: { value: 0 } }
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1.0,
    metalness: 0.0,
    flatShading: true,
  })
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, animUniforms)
    Object.assign(shader.uniforms, pulseUniforms)

    shader.vertexShader =
      'attribute vec3 aBary;\nattribute float aRoad;\nattribute vec3 aOffset;\nuniform float uProgress;\nvarying vec3 vBary;\nvarying float vRoad;\n' +
      shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float _animT    = clamp(uProgress, 0.0, 1.0);
      float _animEase = _animT * _animT * (3.0 - 2.0 * _animT);
      transformed += aOffset * (1.0 - _animEase);
      vBary = aBary;
      vRoad = aRoad;`
    )

    shader.fragmentShader =
      'varying vec3 vBary;\nvarying float vRoad;\nuniform float uTime;\nuniform float uPulse;\n' +
      shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>\n${neonEdgeSrc}`
    )
  }
  mat.customProgramCacheKey = () => 'terrain-anim-neon'
  return { mat, animUniforms }
}

// ─── triangle colour palette ──────────────────────────────────────────────────
const PALETTE = [
  { r: 0.04, g: 0.00, b: 0.14 },  // near-black deep violet
  { r: 0.00, g: 0.08, b: 0.18 },  // dark ocean teal
  { r: 0.10, g: 0.00, b: 0.30 },  // indigo
  { r: 0.22, g: 0.00, b: 0.18 },  // dark magenta
  { r: 0.02, g: 0.43, b: 0.22 },  // midnight blue
  { r: 0.25, g: 0.02, b: 0.25 },  // dark purple
]

// ─── corner jitter ────────────────────────────────────────────────────────────
// Deterministic hash keyed on world XZ grid coords — identical across chunk and
// triangle boundaries so shared corners always displace to the same position.
function cornerJitter(wx, wz) {
  const hx = Math.sin(wx * 127.1 + wz * 311.7) * 43758.5453
  const hz = Math.sin(wx * 269.5 + wz * 183.3) * 43758.5453
  return [
    (hx - Math.floor(hx) - 0.5) * 2 * VERTEX_JITTER,
    (hz - Math.floor(hz) - 0.5) * 2 * VERTEX_JITTER,
  ]
}

// ─── chunk mesh builder ───────────────────────────────────────────────────────
export function buildChunkMesh(chunkX, chunkZ, lod) {
  const segments = LOD_SEGMENTS[Math.min(lod, LOD_SEGMENTS.length - 1)]
  const step     = CHUNK_SIZE / segments
  const originX  = chunkX * CHUNK_SIZE
  const originZ  = chunkZ * CHUNK_SIZE

  const triCount  = segments * segments * 2
  const vertCount = triCount * 3

  const positions = new Float32Array(vertCount * 3)
  const colors    = new Float32Array(vertCount * 3)
  const offsets   = new Float32Array(vertCount * 3)
  const bary      = new Float32Array(vertCount * 3)  // all zero → set one component per vertex
  const aRoad     = new Float32Array(vertCount)

  let vi = 0

  function addVert(wx, wz, ox, oy, oz, baseC) {
    const baseY = terrainHeight(wx, wz)
    const { y, r, g, b, road } = applyRoad(wx, wz, baseY, baseC, terrainHeight)

    const i  = vi * 3
    positions[i]     = wx;  positions[i + 1] = y;  positions[i + 2] = wz
    colors[i]        = r;   colors[i + 1]    = g;  colors[i + 2]    = b
    offsets[i]       = ox;  offsets[i + 1]   = oy; offsets[i + 2]   = oz
    aRoad[vi]        = road

    // Barycentric: vertex 0→(1,0,0), 1→(0,1,0), 2→(0,0,1) repeating per triangle
    bary[i + (vi % 3)] = 1.0

    vi++
  }

  for (let iz = 0; iz < segments; iz++) {
    for (let ix = 0; ix < segments; ix++) {
      const x0 = originX + ix * step, x1 = x0 + step
      const z0 = originZ + iz * step, z1 = z0 + step

      const [jx00, jz00] = cornerJitter(x0, z0)
      const [jx01, jz01] = cornerJitter(x0, z1)
      const [jx10, jz10] = cornerJitter(x1, z0)
      const [jx11, jz11] = cornerJitter(x1, z1)

      const c1  = PALETTE[Math.floor(Math.random() * PALETTE.length)]
      const oy1 = Math.random() * 150
      const ox1 = (Math.random() - 0.3) * 30, oz1 = (Math.random() - 0.3) * 30
      addVert(x0 + jx00, z0 + jz00, ox1, oy1, oz1, c1)
      addVert(x0 + jx01, z1 + jz01, ox1, oy1, oz1, c1)
      addVert(x1 + jx10, z0 + jz10, ox1, oy1, oz1, c1)

      const c2  = PALETTE[Math.floor(Math.random() * PALETTE.length)]
      const oy2 = Math.random() * 150 + 50
      const ox2 = (Math.random() - 0.5) * 20, oz2 = (Math.random() - 0.5) * 20
      addVert(x1 + jx10, z0 + jz10, ox2, oy2, oz2, c2)
      addVert(x0 + jx01, z1 + jz01, ox2, oy2, oz2, c2)
      addVert(x1 + jx11, z1 + jz11, ox2, oy2, oz2, c2)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3))
  geo.setAttribute('aOffset',  new THREE.BufferAttribute(offsets,   3))
  geo.setAttribute('aBary',    new THREE.BufferAttribute(bary,      3))
  geo.setAttribute('aRoad',    new THREE.BufferAttribute(aRoad,     1))
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  geo.boundingSphere.radius += CHUNK_SIZE + 200

  const { mat, animUniforms } = makeAnimMaterial()
  const mesh = new THREE.Mesh(geo, mat)
  mesh.receiveShadow = true
  return { mesh, animUniforms }
}
