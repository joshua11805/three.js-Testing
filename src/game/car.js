import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { scene } from '../engine/core.js'
import { PhysicsBody, addBody, removeBody } from '../engine/physics.js'
import { isPressed } from '../engine/input.js'
import { terrainHeight } from '../engine/terrain/noise.js'
import { surfaceHeight } from '../engine/terrain/road.js'
import { updateCarCamera } from '../engine/carCamera.js'
import player, { playerBody } from './player.js'

// Driving-only game — remove player from physics and scene immediately
removeBody(playerBody)
player.visible = false

// ─── Pivot & physics body ─────────────────────────────────────────────────────
const pivot = new THREE.Group()
scene.add(pivot)

export const carBody = addBody(
  new PhysicsBody({
    mass: 600,
    position: new THREE.Vector3(3, terrainHeight(3, 0) + 2, 0),
    halfSize: new THREE.Vector3(0.65, 0.55, 1.5),
    restitution: 0.05,
    friction: 0.08,
  }),
  pivot
)

// ─── Model ────────────────────────────────────────────────────────────────────
const placeholder = new THREE.Mesh(
  new THREE.BoxGeometry(0.25, 0.3, 1.1),
  new THREE.MeshStandardMaterial({ color: 0x0a0a1a, roughness: 1 })
)
pivot.add(placeholder)

async function loadCar() {
  const json = await fetch('/models/car1.gltf').then(r => r.json())
  if (json.extensionsUsed)
    json.extensionsUsed = json.extensionsUsed.filter(e => e !== 'KHR_materials_unlit')
  json.materials?.forEach(mat => {
    if (mat.extensions) delete mat.extensions.KHR_materials_unlit
  })
  return new Promise((resolve, reject) =>
    new GLTFLoader().parse(JSON.stringify(json), '/models/', resolve, reject))
}

loadCar().then(gltf => {
  pivot.remove(placeholder)
  placeholder.geometry.dispose()
  placeholder.material.dispose()

  const model  = gltf.scene
  const box    = new THREE.Box3().setFromObject(model)
  const size   = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)

  const targetSpan = Math.max(carBody.halfSize.x, carBody.halfSize.z) * 2
  const s = targetSpan / Math.max(size.x, size.z)
  model.scale.setScalar(s)
  model.position.set(-center.x * s, -carBody.halfSize.y - box.min.y * s + 0.5, -center.z * s)
  model.rotation.y = -Math.PI

  model.traverse(child => {
    if (child.isMesh) { child.castShadow = true; child.receiveShadow = true }
  })
  pivot.add(model)
}).catch(err => console.warn('car.gltf failed to load:', err))

// ─── Driving constants ────────────────────────────────────────────────────────
const MAX_SPEED    = 35
const MAX_REVERSE  = 8
const ACCEL        = 6
const BRAKE        = 5
const COAST_DRAG   = 0.03
const LATERAL_GRIP = 17
const STEER_MAX    = 1.5
const STEER_DAMP   = 0.012

// ─── Per-frame state ──────────────────────────────────────────────────────────
let heading = 0
let vFwd    = 0

const _fwd   = new THREE.Vector3()
const _right = new THREE.Vector3()

const NORMAL_SAMPLE = 1.0
const NORMAL_SMOOTH = 6

const _smoothNormal = new THREE.Vector3(0, 1, 0)
const _terrainNorm  = new THREE.Vector3()
const _projFwd      = new THREE.Vector3()
const _carRight     = new THREE.Vector3()
const _backVec      = new THREE.Vector3()
const _worldUp      = new THREE.Vector3(0, 1, 0)
const _mat4         = new THREE.Matrix4()

// ─── Terrain collision ────────────────────────────────────────────────────────
function applyTerrainCollision(halfHeight, delta) {
  const px = carBody.position.x, pz = carBody.position.z
  const hx = carBody.halfSize.x,  hz = carBody.halfSize.z
  const sinH = Math.sin(heading),  cosH = Math.cos(heading)

  // Corner max: used only to decide whether the car is touching ground.
  // Prevents any corner from hanging in mid-air over a crest.
  const cornerFloor = Math.max(
    surfaceHeight(px,                         pz                        ),
    surfaceHeight(px - sinH*hz - cosH*hx, pz - cosH*hz + sinH*hx),
    surfaceHeight(px - sinH*hz + cosH*hx, pz - cosH*hz - sinH*hx),
    surfaceHeight(px + sinH*hz - cosH*hx, pz + cosH*hz + sinH*hx),
    surfaceHeight(px + sinH*hz + cosH*hx, pz + cosH*hz - sinH*hx),
  )

  // Center floor: used for the position correction magnitude only.
  // Using cornerFloor here caused one elevated corner to lift the whole body,
  // producing large lateral corrections (nx * t, nz * t) that jerked the car.
  const centerFloor = surfaceHeight(px, pz)
  const feetY       = carBody.position.y - halfHeight
  const penetration = centerFloor - feetY

  if (penetration > 0) {
    const S  = 1.0
    const gx = (surfaceHeight(px + S, pz) - surfaceHeight(px - S, pz)) / (2 * S)
    const gz = (surfaceHeight(px, pz + S) - surfaceHeight(px, pz - S)) / (2 * S)
    const nLen = Math.sqrt(gx * gx + 1 + gz * gz)
    const nx = -gx / nLen, ny = 1 / nLen, nz = -gz / nLen

    const t = penetration / ny
    carBody.position.x += nx * t
    carBody.position.y += ny * t
    carBody.position.z += nz * t
  }

  // Ground contact from any corner: kill downward vel.y.
  // The old normal-space reflection projected forward velocity (vel.z ≈ 20 m/s) onto
  // slope normals and added vel.y += ny * |vFwd * nz| every frame on any slope.
  // drivingUpdate overwrites vel.x/vel.z each frame but never vel.y, so that upward
  // velocity accumulated and caused the persistent upward jerking.
  if (cornerFloor >= feetY) {
    if (carBody.velocity.y < 0) carBody.velocity.y = 0
    carBody.onGround = true
  }

  // Predictive downward clamp — prevents tunnelling when terrain drops ahead.
  if (feetY > cornerFloor) {
    const npx = carBody.position.x + carBody.velocity.x * delta
    const npz = carBody.position.z + carBody.velocity.z * delta
    const minFallVel = (surfaceHeight(npx, npz) - feetY) / delta
    if (minFallVel < 0 && carBody.velocity.y < minFallVel) carBody.velocity.y = minFallVel
  }
}

// ─── Driving update ───────────────────────────────────────────────────────────
function drivingUpdate(delta) {
  _fwd.set(-Math.sin(heading), 0, -Math.cos(heading))
  _right.set(Math.cos(heading), 0, -Math.sin(heading))

  const vel = carBody.velocity
  let vLat  = vel.dot(_right)

  if (isPressed('KeyW') || isPressed('ArrowUp')) {
    vFwd = Math.min(vFwd + ACCEL * delta, MAX_SPEED)
  } else if (isPressed('KeyS') || isPressed('ArrowDown')) {
    if (vFwd > 1) {
      vFwd = Math.max(vFwd - BRAKE * delta, 0)
    } else {
      vFwd = Math.max(vFwd - ACCEL * delta, -MAX_REVERSE)
    }
  } else {
    vFwd *= (1 - COAST_DRAG * 60 * delta)
    if (Math.abs(vFwd) < 0.05) vFwd = 0
  }

  const authority = Math.min(1, Math.abs(vFwd) / 5)
  const steerRate = STEER_MAX * authority / (1 + Math.abs(vFwd) * STEER_DAMP)
  const steerDir  = Math.sign(vFwd || 1)

  if (isPressed('KeyA') || isPressed('ArrowLeft'))  heading += steerRate * steerDir * delta
  if (isPressed('KeyD') || isPressed('ArrowRight')) heading -= steerRate * steerDir * delta

  vLat *= Math.max(0, 1 - LATERAL_GRIP * delta)
  vel.x = _fwd.x * vFwd + _right.x * vLat
  vel.z = _fwd.z * vFwd + _right.z * vLat

  // Terrain-conforming rotation
  const px = carBody.position.x, pz = carBody.position.z
  if (carBody.onGround) {
    const gx = (terrainHeight(px + NORMAL_SAMPLE, pz) - terrainHeight(px - NORMAL_SAMPLE, pz)) / (2 * NORMAL_SAMPLE)
    const gz = (terrainHeight(px, pz + NORMAL_SAMPLE) - terrainHeight(px, pz - NORMAL_SAMPLE)) / (2 * NORMAL_SAMPLE)
    _terrainNorm.set(-gx, 1, -gz).normalize()
    _smoothNormal.lerp(_terrainNorm, Math.min(1, NORMAL_SMOOTH * delta)).normalize()
  } else {
    _smoothNormal.lerp(_worldUp, Math.min(1, NORMAL_SMOOTH * 0.5 * delta)).normalize()
  }

  _projFwd.copy(_fwd).addScaledVector(_smoothNormal, -_fwd.dot(_smoothNormal))
  if (_projFwd.lengthSq() < 0.001) _projFwd.copy(_fwd)
  _projFwd.normalize()
  _carRight.crossVectors(_projFwd, _smoothNormal).normalize()
  _backVec.copy(_projFwd).negate()
  _mat4.makeBasis(_carRight, _smoothNormal, _backVec)
  pivot.quaternion.setFromRotationMatrix(_mat4)
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function getActiveSpeed()      { return Math.sqrt(carBody.velocity.x ** 2 + carBody.velocity.z ** 2) }
export function getActivePosition()   { return carBody.position }
export function getActiveCarForward() { return heading }
export function updateCar(delta)      { drivingUpdate(delta) }

// Collision and camera are now owned by vehicleSystem.js.
// This stub exists only so older imports don't break at the module boundary.
export function updateCarSystem(delta, active) {
  if (!active) return
  drivingUpdate(delta)
}

export default pivot
