import { camera } from './core.js'

const DISTANCE  = 10
const MIN_PITCH = 0.15  // just above horizon
const MAX_PITCH = 1.4   // near top-down
const SENSITIVITY = 0.005

let yaw   = 0    // horizontal orbit angle
let pitch = 0.4  // vertical orbit angle

let isDragging = false
let lastX = 0
let lastY = 0

export function initFollowCamera() {
  window.addEventListener('pointerdown', e => {
    if (e.button !== 0) return
    isDragging = true
    lastX = e.clientX
    lastY = e.clientY
  })

  window.addEventListener('pointerup',   () => { isDragging = false })
  window.addEventListener('pointerleave', () => { isDragging = false })

  window.addEventListener('pointermove', e => {
    if (!isDragging) return
    yaw   -= (e.clientX - lastX) * SENSITIVITY
    pitch += (e.clientY - lastY) * SENSITIVITY
    pitch  = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch))
    lastX = e.clientX
    lastY = e.clientY
  })
}

export function updateFollowCamera(target) {
  const cosP = Math.cos(pitch)
  const sinP = Math.sin(pitch)

  camera.position.set(
    target.x + DISTANCE * Math.sin(yaw) * cosP,
    target.y + DISTANCE * sinP,
    target.z + DISTANCE * Math.cos(yaw) * cosP
  )
  camera.lookAt(target.x, target.y + 1, target.z)
}

// used by player.js to make WASD relative to camera facing
export function getCameraYaw() { return yaw }
