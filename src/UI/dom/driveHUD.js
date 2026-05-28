let healthFill, scoreEl

export function initDriveHUD() {
  const hud = document.createElement('div')
  hud.id = 'driveHUD'
  hud.innerHTML = `
    <div class="driveHUD-row">
      <span class="hud-label">HP</span>
      <div id="speed-bar"><div id="speed-fill"></div></div>
    </div>
    <div class="driveHUD-row">
      <span class="driveHUD-label">SCORE</span>
      <span id="speed-value">0</span>
    </div>
  `
  document.getElementById('ui').appendChild(hud)

  speedFill = document.getElementById('speed-fill')
  speedVal    = document.getElementById('speed-value')
}

export function setSpeed(value) {
  const v = Math.max(0, Math.min(100, value))
  healthFill.style.width = `${v}%`
  healthFill.style.background =
    v > 60 ? '#dd6ee7' :
    v > 30 ? '#78db4a' : '#f44336'

  speedVal.textContent = value;
}

export function setSpeedVal(value) {
  scoreEl.textContent = value
}
