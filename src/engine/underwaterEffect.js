import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { addPostPass, removePostPass } from './postProcessing.js'
import { WATER_LEVEL } from './terrain/terrainConfig.js'
import underwaterFragSrc from '../game/shaders/underwaterFrag.glsl?raw'

const underwaterPass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    uTime:    { value: 0 },
    uDepth:   { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: underwaterFragSrc,
})

let active = false

export function updateUnderwaterEffect(cameraY, totalTime) {
  const depth = WATER_LEVEL - cameraY   // positive when submerged

  if (depth > 0 && !active) {
    addPostPass(underwaterPass)
    active = true
  } else if (depth <= 0 && active) {
    removePostPass(underwaterPass)
    active = false
  }

  if (active) {
    underwaterPass.uniforms.uTime.value  = totalTime
    underwaterPass.uniforms.uDepth.value = depth
  }
}
