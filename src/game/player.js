import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { scene } from '../engine/core.js'
import { PhysicsBody, addBody } from '../engine/physics.js'
import { isPressed } from '../engine/input.js'
import { getFPSYaw } from '../engine/firstPersonCamera.js'
import { createEntity, addComponent } from '../engine/ecs.js'
import { terrainHeight } from '../engine/terrain/noise.js'

// Invisible group — physics drives its position, player input drives its rotation.
const pivot = new THREE.Group()
scene.add(pivot)

export const playerBody = addBody(
  new PhysicsBody({
    mass: 20,
    position: new THREE.Vector3(0, terrainHeight(0, 0) + 3, 0),
    halfSize: new THREE.Vector3(0.5, 1, 0.5),
    friction: 0.05
  }),
  pivot
)

export const playerEntity = createEntity()
addComponent(playerEntity, 'Player',  {})
addComponent(playerEntity, 'Physics', { body: playerBody })
addComponent(playerEntity, 'Mesh',    { object: pivot })
addComponent(playerEntity, 'Health',  { value: 100, max: 100 })

// ─── Character loading ────────────────────────────────────────────────────────

let mixer = null
const actions = {}
let currentAction = null

const loader = new FBXLoader()
const loadFBX = path => new Promise((resolve, reject) => loader.load(path, resolve, null, reject))

// Mixamo bakes hip translation into every clip (root motion). Strip it so the
// skeleton stays anchored to the physics pivot instead of drifting on its own.
function stripRootMotion(clip) {
  clip.tracks = clip.tracks.filter(t =>
    !(t.name.toLowerCase().includes('hips') && t.name.toLowerCase().includes('position'))
  )
  return clip
}

async function loadCharacter() {
  const [fbx, idleFBX, walkFBX, jumpFBX] = await Promise.all([
    loadFBX('/models/character.fbx'),
    loadFBX('/animations/Breathing Idle.fbx'),
    loadFBX('/animations/Walking.fbx'),
    loadFBX('/animations/Jump.fbx'),
  ])

  fbx.scale.setScalar(0.01)
  fbx.position.y = -1  // shift feet to bottom of physics box
  fbx.visible = false  // hidden in first-person — camera is inside the model
  fbx.traverse(child => {
    if (child.isMesh) child.castShadow = true
  })
  pivot.add(fbx)

  mixer = new THREE.AnimationMixer(fbx)
  actions.idle = mixer.clipAction(stripRootMotion(idleFBX.animations[0]))
  actions.walk = mixer.clipAction(stripRootMotion(walkFBX.animations[0]))
  actions.jump = mixer.clipAction(stripRootMotion(jumpFBX.animations[0]))

  actions.jump.loop = THREE.LoopOnce
  actions.jump.clampWhenFinished = true

  actions.idle.play()
  currentAction = 'idle'
}

// Seconds into the jump clip to start from — skips the windup crouch.
// Tune this if the jump still looks like it has an anticipation phase.
const JUMP_CLIP_OFFSET = 0.5

function transitionTo(name) {
  if (currentAction === name || !actions[name]) return
  const from = actions[currentAction]
  const to   = actions[name]
  to.reset()
  if (name === 'jump') to.time = JUMP_CLIP_OFFSET
  to.fadeIn(0.15).play()
  if (from) from.fadeOut(0.15)
  currentAction = name
}

loadCharacter()

// ─── Movement ─────────────────────────────────────────────────────────────────

const SPEED      = 8
const JUMP_SPEED = 10
const TURN_SPEED = 12  // radians/sec — raise for snappier, lower for floatier
const moveDir    = new THREE.Vector3()
let facingAngle  = 0

export function updatePlayer(delta) {
  const yaw  = getFPSYaw()
  const cosY = Math.cos(yaw)
  const sinY = Math.sin(yaw)

  const forwardX = -sinY,  forwardZ = -cosY
  const rightX   =  cosY,  rightZ   = -sinY

  moveDir.set(0, 0, 0)

  if (isPressed('KeyW') || isPressed('ArrowUp'))    { moveDir.x += forwardX; moveDir.z += forwardZ }
  if (isPressed('KeyS') || isPressed('ArrowDown'))  { moveDir.x -= forwardX; moveDir.z -= forwardZ }
  if (isPressed('KeyA') || isPressed('ArrowLeft'))  { moveDir.x -= rightX;   moveDir.z -= rightZ   }
  if (isPressed('KeyD') || isPressed('ArrowRight')) { moveDir.x += rightX;   moveDir.z += rightZ   }

  const moving = moveDir.lengthSq() > 0

  if (moving) {
    moveDir.normalize()
    const targetAngle = Math.atan2(moveDir.x, moveDir.z)
    let diff = targetAngle - facingAngle
    // Wrap to [-PI, PI] so we always rotate the short way around
    diff = ((diff + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    facingAngle += diff * Math.min(1, TURN_SPEED * delta)
    pivot.rotation.y = facingAngle
  }

  playerBody.velocity.x = moveDir.x * SPEED
  playerBody.velocity.z = moveDir.z * SPEED

  let jumped = false
  if (isPressed('Space') && playerBody.onGround) {
    playerBody.velocity.y = JUMP_SPEED
    jumped = true
  }

  if (mixer) {
    if (!playerBody.onGround || jumped) {
      transitionTo('jump')
    } else {
      transitionTo(moving ? 'walk' : 'idle')
    }
    mixer.update(delta)
  }
}

export default pivot
