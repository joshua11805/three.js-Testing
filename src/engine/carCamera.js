import * as THREE from 'three'
import { camera } from './core.js'

const CHASE_DIST    = 8
const CHASE_HEIGHT  = 4
const LOOK_AHEAD    = 3
const LOOK_UP       = 1.5

const POS_LERP = 0.08      // subtle follow
const LOOK_LERP = 0.12

const _targetPos = new THREE.Vector3()
const _currentLook = new THREE.Vector3()
const _desiredLook = new THREE.Vector3()

export function updateCarCamera(carPosition, heading, delta) {

  // ─────────────────────────────
  // 1. Desired camera position
  // ─────────────────────────────
  const desiredX = carPosition.x + Math.sin(heading) * CHASE_DIST
  const desiredY = carPosition.y + CHASE_HEIGHT
  const desiredZ = carPosition.z + Math.cos(heading) * CHASE_DIST

  _targetPos.set(desiredX, desiredY, desiredZ)

  camera.position.lerp(_targetPos, POS_LERP)

  // ─────────────────────────────
  // 2. Smooth look-at target
  // ─────────────────────────────
  _desiredLook.set(
    carPosition.x - Math.sin(heading) * LOOK_AHEAD,
    carPosition.y + LOOK_UP,
    carPosition.z - Math.cos(heading) * LOOK_AHEAD
  )

  // initialize once
  if (!_currentLook.length()) {
    _currentLook.copy(_desiredLook)
  }

  _currentLook.lerp(_desiredLook, LOOK_LERP)

  camera.lookAt(_currentLook)
}