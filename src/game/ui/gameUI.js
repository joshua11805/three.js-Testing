import { initDriveHud, setSpeed, showDriveHud }         from './driveHUD.js'
import { initPauseMenu, isPaused }                      from './pauseMenu.js'
import { initStartScreen, isStarted }                   from './startScreen.js'
import { DamageNumber }                                 from './DamageNumber.js'
import { showNotification, updateUI, registerWorldElement } from '../../ui/ui.js'
import { playMusic }                                    from '../../engine/audio.js'

export function initGameUI(onStart) {
  initDriveHud()
  initStartScreen(() => {
    showDriveHud()
    playMusic('/audio/background.mp3')
    if (onStart) onStart()
  })
  initPauseMenu()
}

export function updateGameUI(delta) {
  updateUI(delta)
}

export function spawnDamageNumber(amount, position) {
  registerWorldElement(new DamageNumber(amount, position))
}

export { setSpeed, showNotification, isStarted, isPaused }
