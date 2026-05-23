import { onUpdate, startLoop }                  from './engine/loop.js'
import { stepPhysics }                          from './engine/physics.js'
import { initFollowCamera, updateFollowCamera } from './engine/followCamera.js'
import { initUI }                               from './ui/ui.js'
import { initGameUI, updateGameUI, isStarted, isPaused } from './game/ui/gameUI.js'
import './game/level.js'
import player, { updatePlayer }                from './game/player.js'

initFollowCamera()
initUI()
initGameUI()

onUpdate((delta) => {
  stepPhysics(delta)
  updateGameUI(delta)

  if (!isStarted() || isPaused()) return

  updatePlayer(delta)
  updateFollowCamera(player.position)
})

startLoop()
