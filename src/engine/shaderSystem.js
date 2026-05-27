import * as THREE from 'three'
import { query } from './ecs.js'

// Creates a ShaderMaterial with a built-in uTime uniform that tickShaders() advances each frame.
// Pass any additional uniforms in the third argument as THREE uniform objects: { myVal: { value: 0 } }
export function createShaderMaterial(vertSrc, fragSrc, uniforms = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: vertSrc,
    fragmentShader: fragSrc,
    uniforms: {
      uTime: { value: 0 },
      ...uniforms,
    },
  })
}

// Call once per frame. Advances uTime on every unique ShaderMaterial registered under a 'Shader' component.
export function tickShaders(delta) {
  const seen = new Set()
  for (const { Shader } of query('Shader')) {
    if (seen.has(Shader)) continue
    seen.add(Shader)
    if (Shader.uniforms?.uTime !== undefined) {
      Shader.uniforms.uTime.value += delta
    }
  }
}
