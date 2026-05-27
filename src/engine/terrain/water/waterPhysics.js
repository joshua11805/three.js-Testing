const BUOYANCY = 20  // upward acceleration (units/s²) applied when submerged

export function applyWaterPhysics(body, halfHeight, delta, waterLevel) {
  const feetY = body.position.y - halfHeight
  if (feetY >= waterLevel) return  // fully above water — nothing to do

  const bodyHeight     = halfHeight * 2
  const submergedDepth = Math.min(waterLevel - feetY, bodyHeight)
  const fraction       = submergedDepth / bodyHeight

  body.velocity.y += BUOYANCY * fraction * delta

  const drag = Math.pow(0.08, delta)
  body.velocity.x *= drag
  body.velocity.z *= drag
}
