import * as THREE from 'three'
import { terrainHeight, terrainColor } from './noise.js'
import { applyRoad } from './road.js'

export const CHUNK_SIZE = 32
export const LOD_SEGMENTS = [16, 16, 16, 16]

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
  vec3 _edgeCol = mix(vec3(0.0, 1.0, 0.85),  vec3(1.0, 0.1, 0.55),  vRoad);
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

  function addVert(wx, wz, ox, oy, oz) {
    const baseY = terrainHeight(wx, wz)
    const baseC = terrainColor(baseY)
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

      const oy1 = Math.random() * 150
      const ox1 = (Math.random() - 0.3) * 30, oz1 = (Math.random() - 0.3) * 30
      addVert(x0, z0, ox1, oy1, oz1)
      addVert(x0, z1, ox1, oy1, oz1)
      addVert(x1, z0, ox1, oy1, oz1)

      const oy2 = Math.random() * 150 + 50
      const ox2 = (Math.random() - 0.5) * 20, oz2 = (Math.random() - 0.5) * 20
      addVert(x1, z0, ox2, oy2, oz2)
      addVert(x0, z1, ox2, oy2, oz2)
      addVert(x1, z1, ox2, oy2, oz2)
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
