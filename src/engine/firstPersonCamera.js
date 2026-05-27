import { camera, renderer } from './core.js'

const SENSITIVITY = 0.002
const MAX_PITCH   = Math.PI / 2 - 0.01  // just under 90° — prevents flipping
const EYE_HEIGHT  = 0.7                  // units above physics body centre

let yaw   = 0
let pitch = 0
let locked = false

export function initFirstPersonCamera() {
  // Listen on document — the #ui overlay sits above the canvas and swallows
  // canvas-level click events, so we must catch them at the document level.
  document.addEventListener('click', () => {
    if (!document.pointerLockElement) {
      renderer.domElement.requestPointerLock()
    }
  })

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === renderer.domElement
  })

  document.addEventListener('mousemove', e => {
    if (!locked) return
    yaw   -= e.movementX * SENSITIVITY
    pitch -= e.movementY * SENSITIVITY
    pitch  = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch))
  })
}

// Call each frame with the player's physics pivot position
export function updateFirstPersonCamera(playerPosition) {
  camera.position.set(
    playerPosition.x,
    playerPosition.y + EYE_HEIGHT,
    playerPosition.z
  )
  // YXZ order: yaw (Y) applied first, then pitch (X) — standard FPS look
  camera.rotation.order = 'YXZ'
  camera.rotation.y = yaw
  camera.rotation.x = pitch
}

// Player movement uses this so WASD stays relative to where you're looking
export function getFPSYaw() { return yaw }
