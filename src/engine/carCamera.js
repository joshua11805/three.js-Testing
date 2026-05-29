import * as THREE from 'three'
import { camera } from './core.js'
import { isPressed } from './input.js'

const CHASE_DIST    = 8
const CHASE_HEIGHT  = 4
const LOOK_AHEAD    = 3
const LOOK_UP       = 1.5

const POS_LERP     = 0.028
const LOOK_LERP    = 0.12
const HEADING_LERP = 0.06  // camera heading lags behind car — lower = more lag

// FOV — subtle pull-back while accelerating
const FOV_BASE     = 60   // degrees at rest
const FOV_MAX      = 80   // degrees at full W pressure
const FOV_BOOST    = 90  // degrees at full Shift+W pressure
const EXPAND_TIME  = 3.6  // seconds to reach max from rest
const RECOVER_TIME = 1.6  // seconds to return to FOV_BASE from full

let fovPressure  = 0  // 0–1, how wide the FOV is expanding
let boostBlend   = 0  // 0–1, lerps toward 1 while Shift held
let camHeading   = 0  // smoothed heading used for camera placement

const _targetPos = new THREE.Vector3()
const _currentLook = new THREE.Vector3()
const _desiredLook = new THREE.Vector3()

export function updateCarCamera(carPosition, heading, delta) {

  // Lag the camera's heading behind the car's actual heading.
  camHeading += (heading - camHeading) * HEADING_LERP

  // ─────────────────────────────
  // 1. Desired camera position
  // ─────────────────────────────
  const desiredX = carPosition.x + Math.sin(camHeading) * CHASE_DIST
  const desiredY = carPosition.y + CHASE_HEIGHT
  const desiredZ = carPosition.z + Math.cos(camHeading) * CHASE_DIST

  _targetPos.set(desiredX, desiredY, desiredZ)

  camera.position.lerp(_targetPos, POS_LERP)

  // ─────────────────────────────
  // 2. Smooth look-at target
  // ─────────────────────────────
  _desiredLook.set(
    carPosition.x - Math.sin(camHeading) * LOOK_AHEAD,
    carPosition.y + LOOK_UP,
    carPosition.z - Math.cos(camHeading) * LOOK_AHEAD
  )

  // initialize once
  if (!_currentLook.length()) {
    _currentLook.copy(_desiredLook)
  }

  _currentLook.lerp(_desiredLook, LOOK_LERP)

  camera.lookAt(_currentLook)

  // ─────────────────────────────
  // 3. FOV — slow expand on W, faster recover
  // ─────────────────────────────
  const boosting = isPressed('ShiftLeft')
  if (isPressed('KeyW') || isPressed('ArrowUp')) {
    fovPressure = Math.min(1, fovPressure + delta / EXPAND_TIME)
  } else {
    fovPressure = Math.max(0, fovPressure - delta / RECOVER_TIME)
  }

  boostBlend += ((boosting ? 1 : 0) - boostBlend) * Math.min(1, 4 * delta)
  const fovMax = FOV_MAX + (FOV_BOOST - FOV_MAX) * boostBlend
  camera.fov = FOV_BASE + (fovMax - FOV_BASE) * fovPressure
  camera.updateProjectionMatrix()
}