let started = false
let initialized = false

export function initStartScreen(onStart) {
  if (initialized) return
  initialized = true
  const overlay = document.createElement('div')
  overlay.id = 'start-screen'
  overlay.innerHTML = `
    <div class="start-box">
      <h1 class="start-title">DRIVE HORIZON</h1>
      <p class="start-subtitle">ROAD TO NOWHERE</p>
      <button id="start-btn">PLAY</button>
      <div class="start-controls">
        <span>WASD · Move</span>
        <span>SHIFT · BOOST</span>
        <span>ESC · Pause</span>
      </div>
    </div>
  `
  document.getElementById('ui').appendChild(overlay)

  document.getElementById('start-btn').addEventListener('click', () => {
    started = true
    overlay.classList.add('fade-out')
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true })
    if (onStart) onStart()
  })
}

export function isStarted() { return started }
