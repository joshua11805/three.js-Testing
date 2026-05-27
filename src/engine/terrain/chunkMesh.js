import * as THREE from 'three'
import { terrainHeight, terrainColor } from './noise.js'
import { WATER_LEVEL } from './terrainConfig.js'
import waterColorSrc from '../../game/shaders/waterColor.glsl?raw'

export const CHUNK_SIZE = 64

const LOD_SEGMENTS = [32, 32, 32, 32]

export const terrainMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 1.0,
  metalness: 0.0,
  flatShading: true,
})

// Extract just the body of waterColor.glsl (strip the uniform/void main wrapper)
// and inject it into Three.js's MeshStandardMaterial via onBeforeCompile.
terrainMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uWaterLevel = { value: WATER_LEVEL }

  shader.vertexShader = 'varying float vTerrainWorldY;\n' + shader.vertexShader
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    vTerrainWorldY = ( modelMatrix * vec4( position, 1.0 ) ).y;`
  )

  shader.fragmentShader = 'varying float vTerrainWorldY;\nuniform float uWaterLevel;\n' + shader.fragmentShader
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <color_fragment>',
    `#include <color_fragment>\n${waterColorSrc}`
  )
}
terrainMaterial.customProgramCacheKey = () => 'terrain-water-color'

export function buildChunkMesh(chunkX, chunkZ, lod) {
  const segments = LOD_SEGMENTS[Math.min(lod, LOD_SEGMENTS.length - 1)]
  const step     = CHUNK_SIZE / segments
  const stride   = segments + 1

  const vertCount = stride * stride
  const positions = new Float32Array(vertCount * 3)
  const colors    = new Float32Array(vertCount * 3)
  const uvs       = new Float32Array(vertCount * 2)

  const originX = chunkX * CHUNK_SIZE
  const originZ = chunkZ * CHUNK_SIZE

  let vi = 0, ci = 0, ui = 0
  for (let iz = 0; iz < stride; iz++) {
    for (let ix = 0; ix < stride; ix++) {
      const wx = originX + ix * step
      const wz = originZ + iz * step
      const y  = terrainHeight(wx, wz)
      const c  = terrainColor(y)

      positions[vi++] = wx;  positions[vi++] = y;   positions[vi++] = wz
      colors[ci++]    = c.r; colors[ci++]    = c.g; colors[ci++]    = c.b
      uvs[ui++]       = ix / segments
      uvs[ui++]       = iz / segments
    }
  }

  const indices = new Uint32Array(segments * segments * 6)
  let ii = 0
  for (let iz = 0; iz < segments; iz++) {
    for (let ix = 0; ix < segments; ix++) {
      const a = iz * stride + ix
      const b = a + 1
      const c = a + stride
      const d = c + 1
      indices[ii++] = a; indices[ii++] = c; indices[ii++] = b
      indices[ii++] = b; indices[ii++] = c; indices[ii++] = d
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3))
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs,       2))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  geo.boundingSphere.radius += CHUNK_SIZE  // pad so edge chunks aren't incorrectly culled

  const mesh = new THREE.Mesh(geo, terrainMaterial)
  mesh.receiveShadow = true
  return mesh
}

