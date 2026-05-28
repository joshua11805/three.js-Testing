let speedValue
let speedCircle

const MAX_SPEED = 200
const CIRCUMFERENCE = 2 * Math.PI * 80 // r=80 => ~502
const WHITE = { r: 250, g: 250, b: 250 }
const GREEN = { r: 10, g: 240, b: 50 }
const PURPLE = { r: 100, g: 81, b: 150 }
const RED = { r: 240, g: 29, b: 22 }

export function initDriveHud() {
  if (document.getElementById('driveHUD')) return

  const hud = document.createElement('div')
  hud.id = 'driveHUD'

  hud.innerHTML = `
    <div id="speedometer">
      <svg viewBox="0 0 200 200">
        <circle class="speed-bg" cx="100" cy="100" r="80"></circle>
        <circle class="speed-fill" cx="100" cy="100" r="80"></circle>
      </svg>

      <div class="speed-text">
        <span id="speed-value">0</span>
        <span id="speed-unit">MPH</span>
      </div>
    </div>
  `

  document.getElementById('ui').appendChild(hud)

  speedValue = document.getElementById('speed-value')
  speedCircle = document.querySelector('.speed-fill')

  speedCircle.style.strokeDasharray = `${CIRCUMFERENCE}`
  speedCircle.style.strokeDashoffset = `${CIRCUMFERENCE}`
}

function lerpColor(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  }
}

function rgbToCss(c) {
  return `rgb(${c.r | 0}, ${c.g | 0}, ${c.b | 0})`
}

export function setSpeed(value) {
  const v = Math.max(0, Math.floor(value) * 4)

  // number
  speedValue.textContent = v

  // progress
  const progress = v / MAX_SPEED
  const offset = CIRCUMFERENCE * (1 - progress)

  speedCircle.style.strokeDashoffset = offset

  const t = v / 100

  let color
    if (t < 0.3) {
    const c = lerpColor(WHITE, GREEN, t / 0.3)
    color = rgbToCss(c)
    } else {
    const c = lerpColor(GREEN, PURPLE, (t - 0.3) / 0.7)
    color = rgbToCss(c)
    }
  const glow =
  v > 60 ? 1.0 :
  v > 30 ? 0.6 :
           0.3

  speedCircle.style.stroke = color
  speedValue.style.color = color
  speedValue.style.textShadow = `
  0 0 ${6 * glow}px rgba(255,255,255,0.25),
  0 0 ${18 * glow}px rgba(255,255,255,0.2),
  0 0 ${36 * glow}px ${color}
`
}