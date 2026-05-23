import * as THREE from 'three'

//Constants

const GRAVITY = -20
const MAX_FALL_SPEED = 50
const SOLVER_ITERATIONS = 4

//Actor storage
const bodies = []

//Shared Temp Vectors
const _mtv = new THREE.Vector3()
const _closest = new THREE.Vector3()

const _normal = new THREE.Vector3()

const _relativeVelocity = new THREE.Vector3()

const _normalVelocity = new THREE.Vector3()

const _tangent = new THREE.Vector3()

const _impulse = new THREE.Vector3()

const _frictionImpulse = new THREE.Vector3()

const _delta = new THREE.Vector3()

//PhysicsBody
export class PhysicsBody {
  constructor({
    isStatic = false,
    position,
    halfSize = null,
    radius = null,
    type = 'box',

    // physics materials
    mass = 1,
    restitution = 0.15,
    friction = 0.3
  }) {
    this.isStatic = isStatic

    this.position =
      new THREE.Vector3().copy(position)

    this.velocity =
      new THREE.Vector3()

    this.type = type

    this.halfSize = halfSize
      ? new THREE.Vector3().copy(halfSize)
      : null

    this.radius = radius

    // MASS
    this.mass =
      isStatic ? Infinity : mass

    this.invMass =
      isStatic ? 0 : 1 / mass

    // MATERIALS
    this.restitution = restitution
    this.friction = friction

    // STATE
    this.onGround = false

    // RENDER LINK
    this.mesh = null
  }
}

//Add Body
export function addBody(body, mesh = null) {
  body.mesh = mesh
  bodies.push(body)
  return body
}

export function removeBody(body) {
  const i = bodies.indexOf(body)
  if (i !== -1) bodies.splice(i, 1)
}

//Helpers
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

//AABB box collision
function getOverlap(a, b, out) {
  const dx =
    b.position.x - a.position.x

  const dy =
    b.position.y - a.position.y

  const dz =
    b.position.z - a.position.z

  const ox =
    (a.halfSize.x + b.halfSize.x)
    - Math.abs(dx)

  const oy =
    (a.halfSize.y + b.halfSize.y)
    - Math.abs(dy)

  const oz =
    (a.halfSize.z + b.halfSize.z)
    - Math.abs(dz)

  if (
    ox <= 0 ||
    oy <= 0 ||
    oz <= 0
  ) {
    return false
  }

  if (ox <= oy && ox <= oz) {
    out.set(
      Math.sign(dx) * ox,
      0,
      0
    )
  }
  else if (oy <= ox && oy <= oz) {
    out.set(
      0,
      Math.sign(dy) * oy,
      0
    )
  }
  else {
    out.set(
      0,
      0,
      Math.sign(dz) * oz
    )
  }

  return true
}

//sphere v sphere collision
function getSphereOverlap(a, b, out) {
  _delta.subVectors(
    b.position,
    a.position
  )

  const distSq =
    _delta.lengthSq()

  const radiusSum =
    a.radius + b.radius

  if (
    distSq >= radiusSum * radiusSum
  ) {
    return false
  }

  const dist =
    Math.sqrt(distSq)

  // avoid divide by zero
  if (dist === 0) {
    out.set(0, radiusSum, 0)
    return true
  }

  const overlap =
    radiusSum - dist

  _delta.normalize()

  out.copy(_delta)
  out.multiplyScalar(overlap)

  return true
}

//sphere v box collsion
function getSphereBoxOverlap(
  sphere,
  box,
  out
) {
  const minX =
    box.position.x - box.halfSize.x

  const maxX =
    box.position.x + box.halfSize.x

  const minY =
    box.position.y - box.halfSize.y

  const maxY =
    box.position.y + box.halfSize.y

  const minZ =
    box.position.z - box.halfSize.z

  const maxZ =
    box.position.z + box.halfSize.z

  _closest.set(
    clamp(
      sphere.position.x,
      minX,
      maxX
    ),

    clamp(
      sphere.position.y,
      minY,
      maxY
    ),

    clamp(
      sphere.position.z,
      minZ,
      maxZ
    )
  )

  _delta.subVectors(
    sphere.position,
    _closest
  )

  const distSq =
    _delta.lengthSq()

  if (
    distSq >=
    sphere.radius * sphere.radius
  ) {
    return false
  }

  const dist =
    Math.sqrt(distSq)

  // center inside box
  if (dist === 0) {
    out.set(0, sphere.radius, 0)
    return true
  }

  const overlap =
    sphere.radius - dist

  _delta.normalize()

  out.copy(_delta)
  out.multiplyScalar(overlap)

  return true
}


//sorts the collision type and calls the correct func
function getCollisionMTV(a, b, out) {
  //box v box
  if (
    a.type === 'box' &&
    b.type === 'box'
  ) {
    return getOverlap(a, b, out)
  }

//sphere v sphere
  if (
    a.type === 'sphere' &&
    b.type === 'sphere'
  ) {
    return getSphereOverlap(a, b, out)
  }
  // sphere v box
  if (
    a.type === 'sphere' &&
    b.type === 'box'
  ) {
    const hit =
      getSphereBoxOverlap(
        a,
        b,
        out
      )

    // convention:
    // MTV pushes b out of a
    if (hit) out.negate()

    return hit
  }
  //box v sphere
  if (
    a.type === 'box' &&
    b.type === 'sphere'
  ) {
    return getSphereBoxOverlap(
      b,
      a,
      out
    )
  }

  return false
}

//Positional Correction
function positionalCorrection(
  a,
  b,
  normal,
  penetration
) {
  const totalInvMass =
    a.invMass + b.invMass

  if (totalInvMass <= 0) {
    return
  }

  if (!a.isStatic) {
    a.position.addScaledVector(
      normal,
      -penetration *
      (a.invMass / totalInvMass)
    )
  }

  if (!b.isStatic) {
    b.position.addScaledVector(
      normal,
      penetration *
      (b.invMass / totalInvMass)
    )
  }
}

//Relative Velocity
function getRelativeVelocity(
  a,
  b,
  out
) {
  return out.subVectors(
    b.velocity,
    a.velocity
  )
}

//Collision Impulse
function applyCollisionImpulse(
  a,
  b,
  normal,
  restitution
) {
  const totalInvMass =
    a.invMass + b.invMass

  if (totalInvMass <= 0) {
    return
  }

  getRelativeVelocity(
    a,
    b,
    _relativeVelocity
  )

  const velocityAlongNormal =
    _relativeVelocity.dot(normal)

  // already separating
  if (velocityAlongNormal > 0) {
    return
  }

  const impulseScalar =
    -(1 + restitution) *
    velocityAlongNormal /
    totalInvMass

  _impulse.copy(normal)

  _impulse.multiplyScalar(
    impulseScalar
  )

  if (!a.isStatic) {
    a.velocity.addScaledVector(
      _impulse,
      -a.invMass
    )
  }

  if (!b.isStatic) {
    b.velocity.addScaledVector(
      _impulse,
      b.invMass
    )
  }

  return impulseScalar
}

//Friction Impulse
function applyFrictionImpulse(
  a,
  b,
  normal,
  impulseScalar,
  friction
) {
  const totalInvMass =
    a.invMass + b.invMass

  if (totalInvMass <= 0) {
    return
  }

  getRelativeVelocity(
    a,
    b,
    _relativeVelocity
  )

  // tangent =
  // relativeVelocity - normalVelocity

  _normalVelocity.copy(normal)

  _normalVelocity.multiplyScalar(
    _relativeVelocity.dot(normal)
  )

  _tangent.copy(_relativeVelocity)

  _tangent.sub(_normalVelocity)

  if (_tangent.lengthSq() < 0.0001) {
    return
  }

  _tangent.normalize()

  _frictionImpulse.copy(_tangent)

  _frictionImpulse.multiplyScalar(
    -friction * impulseScalar
  )

  // walls must not dampen vertical velocity — doing so prevents jumping
  if (Math.abs(normal.y) < 0.5) {
    _frictionImpulse.y = 0
  }

  if (!a.isStatic) {
    a.velocity.addScaledVector(
      _frictionImpulse,
      -a.invMass
    )
  }

  if (!b.isStatic) {
    b.velocity.addScaledVector(
      _frictionImpulse,
      b.invMass
    )
  }
}

//Ground State
function updateGroundState(
  a,
  b,
  normal
) {
  if (
    normal.y > 0.5 &&
    !b.isStatic
  ) {
    b.onGround = true
  }

  if (
    normal.y < -0.5 &&
    !a.isStatic
  ) {
    a.onGround = true
  }
}

//Collision Resolution
function resolveCollision(a, b) {
  if (
    !getCollisionMTV(a, b, _mtv)
  ) {
    return
  }

  _normal.copy(_mtv)
  _normal.normalize()

  const penetration =
    _mtv.length()

  //Positional Correction
  positionalCorrection(
    a,
    b,
    _normal,
    penetration
  )

  //Material Combination
  const restitution =
    Math.min(
      a.restitution,
      b.restitution
    )

  const friction =
    Math.sqrt(
      a.friction * b.friction
    )

  //Normal Impulse
  const impulseScalar =
    applyCollisionImpulse(
      a,
      b,
      _normal,
      restitution
    )
  //Friction Impulse
  if (impulseScalar !== undefined) {
    applyFrictionImpulse(
      a,
      b,
      _normal,
      impulseScalar,
      friction
    )
  }
  updateGroundState(
    a,
    b,
    _normal
  )
}

/* ======================================================
   PHYSICS STEP
====================================================== */

export function stepPhysics(delta) {
  /* =========================================
     INTEGRATION
  ========================================= */

  for (const body of bodies) {
    if (body.isStatic) {
      continue
    }

    body.onGround = false

    /* =====================================
       GRAVITY
    ===================================== */

    body.velocity.y +=
      GRAVITY * delta

    body.velocity.y = Math.max(
      body.velocity.y,
      -MAX_FALL_SPEED
    )

    /* =====================================
       DAMPING
    ===================================== */

    body.velocity.multiplyScalar(0.999)

    /* =====================================
       MOVEMENT
    ===================================== */

    body.position.addScaledVector(
      body.velocity,
      delta
    )
  }

  /* =========================================
     COLLISION SOLVER
  ========================================= */

  for (
    let iteration = 0;
    iteration < SOLVER_ITERATIONS;
    iteration++
  ) {
    for (let i = 0; i < bodies.length; i++) {
      for (
        let j = i + 1;
        j < bodies.length;
        j++
      ) {
        const a = bodies[i]
        const b = bodies[j]

        if (
          a.isStatic &&
          b.isStatic
        ) {
          continue
        }

        resolveCollision(a, b)
      }
    }
  }

  /* =========================================
     SYNC MESHES
  ========================================= */

  for (const body of bodies) {
    if (!body.mesh) {
      continue
    }

    body.mesh.position.copy(
      body.position
    )

    /* =====================================
       FAKE SPHERE ROLLING
    ===================================== */

    if (body.type === 'sphere') {
      body.mesh.rotation.z +=
        body.velocity.x * delta

      body.mesh.rotation.x -=
        body.velocity.z * delta
    }
  }
}