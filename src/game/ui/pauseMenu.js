import { pauseMusic, resumeMusic, pauseEngineAudio, resumeEngineAudio } from '../../engine/audio.js'

let paused = false
let overlay = null

function setPaused(val) {
  paused = val
  overlay.classList.toggle('visible', paused)
  if (paused) { pauseMusic(); pauseEngineAudio() }
  else        { resumeMusic(); resumeEngineAudio() }
}

export function isPaused() { return paused }

export function initPauseMenu() {
  document.getElementById('pause-menu')?.remove()
  if (window.__pauseEscHandler) {
    window.removeEventListener('keydown', window.__pauseEscHandler)
    window.__pauseEscHandler = null
  }
  paused = false

  overlay = document.createElement('div')
  overlay.id = 'pause-menu'
  overlay.innerHTML = `
    <div class="menu-box">
      <h2>PAUSED</h2>
      <button id="resume-btn">Resume</button>
      <button id="restart-btn">Restart</button>
    </div>
  `
  document.getElementById('ui').appendChild(overlay)

  overlay.querySelector('#resume-btn').addEventListener('click', () => setPaused(false))
  overlay.querySelector('#restart-btn').addEventListener('click', () => window.location.reload())

  window.__pauseEscHandler = e => { if (e.code === 'Escape') setPaused(!paused) }
  window.addEventListener('keydown', window.__pauseEscHandler)
}
