import * as THREE from 'three'
import { CHUNK_SIZE } from '../chunkMesh.js'
import waterVertSrc from '../../../game/shaders/waterVert.glsl?raw'
import waterFragSrc from '../../../game/shaders/waterFrag.glsl?raw'

function makeNormalMap(size = 128) {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const u = x / size
      const v = y / size
      const nx = Math.sin(u * 12.3 + 1.1) * 0.4 + Math.sin(v * 8.7 - 0.5) * 0.3
      const ny = Math.cos(u * 9.1 - 0.7) * 0.3 + Math.cos(v * 11.5 + 2.3) * 0.4
      data[i + 0] = Math.floor((nx * 0.5 + 0.5) * 255)
      data[i + 1] = Math.floor((ny * 0.5 + 0.5) * 255)
      data[i + 2] = 255
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}

// Shared material — uTime is global so one update covers all quads
const waterMaterial = new THREE.ShaderMaterial({
  vertexShader:   waterVertSrc,
  fragmentShader: waterFragSrc,
  uniforms: THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime:      { value: 0 },
      uNormalMap: { value: makeNormalMap() },
    }
  ]),
  transparent: true,
  fog: true,
})

export class WaterMesh {
  constructor(size, waterLevel) {
    const segments = Math.round(size / 8)  // ~8 units per segment
    const geo = new THREE.PlaneGeometry(size, size, segments, segments)
    geo.rotateX(-Math.PI / 2)
    this.mesh = new THREE.Mesh(geo, waterMaterial)
    this.mesh.position.y    = waterLevel
    this.mesh.frustumCulled = false
  }

  update(time) {
    waterMaterial.uniforms.uTime.value = time
  }

  dispose() {
    this.mesh.geometry.dispose()
  }
}
