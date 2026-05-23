import { initHud, setHealth, setScore }  from './hud.js'
import { initPauseMenu, isPaused }       from './pauseMenu.js'
import { initStartScreen, isStarted }    from './startScreen.js'
import { DamageNumber }                  from './DamageNumber.js'
import { showNotification, updateUI }    from '../../ui/ui.js'

const worldElements = []

export function initGameUI() {
  initStartScreen()
  initHud()
  initPauseMenu()
}

export function updateGameUI(delta) {
  updateUI(delta)

  for (let i = worldElements.length - 1; i >= 0; i--) {
    const el = worldElements[i]
    el.update(delta)
    if (el.done) {
      el.destroy()
      worldElements.splice(i, 1)
    }
  }
}

export function spawnDamageNumber(amount, position) {
  worldElements.push(new DamageNumber(amount, position))
}

export { setHealth, setScore, showNotification, isStarted, isPaused }
