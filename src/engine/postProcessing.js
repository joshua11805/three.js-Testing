import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { renderer, scene, camera } from './core.js'

export const composer = new EffectComposer(renderer)

composer.addPass(new RenderPass(scene, camera))

// Bloom — only fires on fragments above the luminance threshold (0.85),
// so it catches the bright rim glow without washing out the rest of the scene.
export const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.0,   // strength
  0.1,   // radius
  1.0   // luminance threshold
)
bloomPass.enabled = true  // opt-in: import bloomPass and set .enabled = true to activate
composer.addPass(bloomPass)

// OutputPass converts the linear render target back to sRGB for display.
composer.addPass(new OutputPass())

// Inserts a custom pass before the final OutputPass.
export function addPostPass(pass) {
  composer.passes.splice(composer.passes.length - 1, 0, pass)
}

export function removePostPass(pass) {
  composer.removePass(pass)
}

window.addEventListener('resize', () => {
  composer.setSize(window.innerWidth, window.innerHeight)
  bloomPass.resolution.set(window.innerWidth, window.innerHeight)
})
