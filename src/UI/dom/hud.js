let healthFill, scoreEl

export function initHud() {
  const hud = document.createElement('div')
  hud.id = 'hud'
  hud.innerHTML = `
    <div class="hud-row">
      <span class="hud-label">HP</span>
      <div id="health-bar"><div id="health-fill"></div></div>
    </div>
    <div class="hud-row">
      <span class="hud-label">SCORE</span>
      <span id="score-value">0</span>
    </div>
  `
  document.getElementById('ui').appendChild(hud)

  healthFill = document.getElementById('health-fill')
  scoreEl    = document.getElementById('score-value')
}

export function setHealth(value) {
  const v = Math.max(0, Math.min(100, value))
  healthFill.style.width = `${v}%`
  healthFill.style.background =
    v > 60 ? '#4caf50' :
    v > 30 ? '#ff9800' : '#f44336'
}

export function setScore(value) {
  scoreEl.textContent = value
}
