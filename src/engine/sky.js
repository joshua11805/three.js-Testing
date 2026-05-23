import * as THREE from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { scene, sun } from './core.js'

export function initSky({
  turbidity       = 4,
  rayleigh        = 1.2,
  mieCoefficient  = 0.005,
  mieDirectionalG = 0.8,
  elevation       = 20,   // degrees above horizon
  azimuth         = 210,  // degrees around Y axis
} = {}) {
  scene.background = null

  const sky = new Sky()
  sky.scale.setScalar(450000)
  scene.add(sky)

  const u = sky.material.uniforms
  u.turbidity.value       = turbidity
  u.rayleigh.value        = rayleigh
  u.mieCoefficient.value  = mieCoefficient
  u.mieDirectionalG.value = mieDirectionalG

  const phi   = THREE.MathUtils.degToRad(90 - elevation)
  const theta = THREE.MathUtils.degToRad(azimuth)
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta)
  u.sunPosition.value.copy(sunDir)

  // Sync the scene directional light to the same sun direction
  sun.position.copy(sunDir.clone().multiplyScalar(100))

  return sky
}
