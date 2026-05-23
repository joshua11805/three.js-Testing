import { renderer, scene, camera } from './core.js'

const updates = []
let lastTime = 0

export function onUpdate(fn) {
  updates.push(fn)
}

export function startLoop() {
  function tick(time) {
    const delta = Math.min((time - lastTime) / 1000, 0.1)
    lastTime = time
    updates.forEach(fn => fn(delta))
    renderer.render(scene, camera)
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
