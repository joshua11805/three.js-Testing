import { onUpdate, startLoop }                              from './engine/loop.js'
import { stepPhysics }                                      from './engine/physics.js'
import { initFirstPersonCamera }                            from './engine/firstPersonCamera.js'
import { tickShaders }                                      from './engine/shaderSystem.js'
import { initDebug }                                        from './engine/debug.js'
import { initUI }                                           from './ui/ui.js'
import { initGameUI, updateGameUI, isStarted, isPaused, setSpeed }    from './game/ui/gameUI.js'
import { initTerrain, updateTerrain }                       from './engine/terrain/chunkManager.js'
import { updateRoad }                                        from './engine/terrain/road.js'
import { initTerrainUI }                                    from './engine/terrain/terrainUI.js'
import { pulseUniforms }                                    from './engine/terrain/chunkMesh.js'
import { scene }                                            from './engine/core.js'
import { initEngineAudio, updateEngineAudio }               from './engine/audio.js'
import { initEngineSynthUI }                                from './engine/engineSynthUI.js'
import './game/level.js'
import { updateVehicleSystem, getActiveSpeed, getActivePosition, getActiveCarForward } from './game/vehicleSystem.js'

initDebug()
initFirstPersonCamera()
initUI()
initGameUI()
initTerrain(scene)
initTerrainUI()
initEngineAudio()
initEngineSynthUI()

let totalTime = 0

onUpdate((delta) => {
  totalTime += delta

  pulseUniforms.uTime.value  = totalTime
  pulseUniforms.uPulse.value = Math.min(1.0, Math.max(0.0, (getActiveSpeed() - 45) / 45))

  tickShaders(delta)
  stepPhysics(delta)
  updateGameUI(delta)
  setSpeed(getActiveSpeed())
  updateEngineAudio(getActiveSpeed(), 45)

  const active = isStarted() && !isPaused()
  updateVehicleSystem(delta, active)

  const pos = getActivePosition()
  updateRoad(pos.x, pos.z)
  if (active) updateTerrain(pos, totalTime, getActiveCarForward(), delta)
})

startLoop()
