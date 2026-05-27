import { composer } from './postProcessing.js'
import { debugBegin, debugEnd } from './debug.js'

const updates = []
let lastTime = 0

export function onUpdate(fn) {
  updates.push(fn)
}

export function startLoop() {
  function tick(time) {
    debugBegin()
    const delta = Math.min((time - lastTime) / 1000, 0.1)
    lastTime = time
    updates.forEach(fn => fn(delta))
    composer.render()
    debugEnd()
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
