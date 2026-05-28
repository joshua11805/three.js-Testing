import { surfaceHeight }   from '../engine/terrain/road.js'
import { updateCarCamera } from '../engine/carCamera.js'
import { carBody, updateCar, getActiveSpeed, getActivePosition, getActiveCarForward } from './car.js'

export { getActiveSpeed, getActivePosition, getActiveCarForward }

// ─── Raycast suspension ───────────────────────────────────────────────────────
// Wheel attachment points in car-local space [longitudinal, lateral].
// Positive longitudinal = toward front; positive lateral = toward left.
// Forward direction in world space is (-sinH, 0, -cosH), so:
//   world offset = ( -lf*sinH - lt*cosH,  0,  -lf*cosH + lt*sinH )
const WHEELS = [
  [  1.0,  0.5 ],  // front-left
  [  1.0, -0.5 ],  // front-right
  [ -1.0,  0.5 ],  // rear-left
  [ -1.0, -0.5 ],  // rear-right
]

const SUSP_REST = 0.25   // desired gap: car-bottom to terrain at rest (world units)
const SPRING_K  = 45     // spring stiffness  — upward accel per unit compression, per wheel
const SPRING_D  = 14     // damper coefficient — accel reduction per unit of vertical velocity

function applySuspension(body, halfHeight, delta) {
  const heading = getActiveCarForward()
  const sinH    = Math.sin(heading)
  const cosH    = Math.cos(heading)
  const px      = body.position.x
  const pz      = body.position.z
  const hubY    = body.position.y - halfHeight   // world Y of the car's underside

  let springAccel = 0
  let grounded    = 0

  for (const [lf, lt] of WHEELS) {
    const wx = px - lf * sinH - lt * cosH
    const wz = pz - lf * cosH + lt * sinH

    // compression > 0 means terrain is within spring range
    const compression = SUSP_REST - (hubY - surfaceHeight(wx, wz))
    if (compression > 0) {
      springAccel += SPRING_K * compression
      grounded++
    }
  }

  if (grounded > 0) {
    springAccel     -= SPRING_D * body.velocity.y   // damper opposes current vertical motion
    body.velocity.y += springAccel * delta
    body.velocity.y  = Math.min(body.velocity.y, 10) // cap upward to prevent launch spikes
    body.onGround    = true
  }

  // Hard floor safety — catches tunnelling at high fall speeds that the spring alone
  // cannot correct in a single timestep
  const centerFloor = surfaceHeight(px, pz)
  if (body.position.y - halfHeight < centerFloor) {
    body.position.y = centerFloor + halfHeight
    if (body.velocity.y < 0) body.velocity.y = 0
  }
}

// ─── Main update ──────────────────────────────────────────────────────────────
export function updateVehicleSystem(delta, active) {
  applySuspension(carBody, carBody.halfSize.y, delta)
  if (!active) return
  updateCar(delta)
  updateCarCamera(carBody.position, getActiveCarForward(), delta)
}
