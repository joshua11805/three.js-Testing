import { onUpdate, startLoop }                         from './engine/loop.js'
import { stepPhysics }                                  from './engine/physics.js'
import { initFirstPersonCamera, updateFirstPersonCamera } from './engine/firstPersonCamera.js'
import { tickShaders }                                  from './engine/shaderSystem.js'
import { initDebug }                                    from './engine/debug.js'
import { initUI }                                       from './ui/ui.js'
import { initGameUI, updateGameUI, isStarted, isPaused } from './game/ui/gameUI.js'
import { initTerrain, updateTerrain, WATER_LEVEL }       from './engine/terrain/chunkManager.js'
import { initTerrainUI }                                from './engine/terrain/terrainUI.js'
import { terrainHeight }                                from './engine/terrain/noise.js'
import { applyWaterPhysics }                             from './engine/terrain/water/waterPhysics.js'
import { query }                                        from './engine/ecs.js'
import { scene, camera }                                from './engine/core.js'
import { updateUnderwaterEffect }                       from './engine/underwaterEffect.js'
import './game/level.js'
import player, { updatePlayer, playerBody }             from './game/player.js'
import { initSky } from './engine/sky.js'


initDebug()
initFirstPersonCamera()
initUI()
initGameUI()
initTerrain(scene)
//initSky()
initTerrainUI()

let totalTime = 0

// Clamps a physics body above the terrain surface each frame.
// This replaces the old static floor body for bodies that move over terrain.
function applyTerrainCollision(body, halfHeight) {
  const floor = terrainHeight(body.position.x, body.position.z)
  const feet  = body.position.y - halfHeight
  if (feet < floor) {
    body.position.y = floor + halfHeight
    if (body.velocity.y < 0) {
      body.velocity.y *= -body.restitution
      if (Math.abs(body.velocity.y) < 0.5) body.velocity.y = 0
      body.onGround = true
    }
  }
}

onUpdate((delta) => {
  totalTime += delta
  updateUnderwaterEffect(camera.position.y, totalTime)
  tickShaders(delta)
  stepPhysics(delta)
  updateGameUI(delta)

  // Terrain collision and water physics for the player
  applyTerrainCollision(playerBody, playerBody.halfSize.y)
  applyWaterPhysics(playerBody, playerBody.halfSize.y, delta, WATER_LEVEL)

  // Terrain collision and water physics for all balls
  for (const { Physics } of query('Physics', 'Ball')) {
    applyTerrainCollision(Physics.body, Physics.body.radius)
    applyWaterPhysics(Physics.body, Physics.body.radius, delta, WATER_LEVEL)
  }

  if (!isStarted() || isPaused()) return

  updatePlayer(delta)
  updateFirstPersonCamera(player.position)
  updateTerrain(player.position, totalTime)
})

startLoop()
