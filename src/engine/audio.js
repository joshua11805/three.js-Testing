import * as THREE from 'three'
import { camera } from './core.js'

export const listener = new THREE.AudioListener()
camera.add(listener)

const ctx = listener.context

// Browsers block AudioContext until user interaction
const _resume = () => {
  if (ctx.state === 'suspended') ctx.resume()
  document.removeEventListener('click',   _resume)
  document.removeEventListener('keydown', _resume)
}
document.addEventListener('click',   _resume)
document.addEventListener('keydown', _resume)

// ─── Background music ──────────────────────────────────────────────────────────
let _bgm = null

export function playMusic(url, volume = 0.4) {
  if (_bgm) { _bgm.stop(); _bgm = null }
  _bgm = new THREE.Audio(listener)
  new THREE.AudioLoader().load(url, buf => {
    _bgm.setBuffer(buf)
    _bgm.setLoop(true)
    _bgm.setVolume(volume)
    _bgm.play()
  }, undefined, err => console.warn('BGM failed:', url, err))
}

export function pauseMusic() {
  if (_bgm?.isPlaying) _bgm.pause()
}

export function resumeMusic() {
  if (_bgm && !_bgm.isPlaying) _bgm.play()
}

export function stopMusic() {
  if (_bgm?.isPlaying) _bgm.stop()
  _bgm = null
}

export function setMusicVolume(v) {
  if (_bgm) _bgm.setVolume(Math.max(0, v))
}

export function pauseEngineAudio() {
  if (!_engineGain) return
  _engineGain.gain.cancelScheduledValues(ctx.currentTime)
  _engineGain.gain.setValueAtTime(0, ctx.currentTime)
}

export function resumeEngineAudio() {
  // updateEngineAudio will ramp gain back up naturally on the next active frame
}

// ─── One-shot SFX ─────────────────────────────────────────────────────────────
const _sfxCache = new Map()

export function playSound(url, volume = 1.0) {
  const fire = buf => {
    const sound = new THREE.Audio(listener)
    sound.setBuffer(buf)
    sound.setVolume(volume)
    sound.play()
    sound.onEnded = () => sound.disconnect()
  }
  const cached = _sfxCache.get(url)
  if (cached) {
    fire(cached)
  } else {
    new THREE.AudioLoader().load(url, buf => {
      _sfxCache.set(url, buf)
      fire(buf)
    }, undefined, err => console.warn('SFX failed:', url, err))
  }
}

// ─── Engine synthesizer ───────────────────────────────────────────────────────
// Signal chain: oscillators → filter → pulseGain (AM LFO) → masterGain
//
// Gear simulation: speed is divided into N equal bands. Within each band the
// normalised RPM rises from rpmLow → rpmHigh, then resets on the next gear.
// That sawtooth RPM curve drives oscillator pitch and LFO rate, producing the
// characteristic rise-and-drop of real gear changes.
// On an upshift a brief gain dip is scheduled to simulate clutch disengagement.
export const engineConfig = {
  idleHz:    40,
  maxHz:     200,
  idleVol:   0.05,
  maxVol:    0.22,
  smooth:    0.2,
  filterQ:   1.8,
  lfoIdleHz: 4,
  lfoMaxHz:  52,
  lfoDepth:  0.35,
  gears:     5,     // number of gear bands across the full speed range
  rpmLow:    0.15,  // normalised RPM at the bottom of each gear (0–1)
  rpmHigh:   0.90,  // normalised RPM at the top of each gear before upshift
}

let _osc1 = null, _osc2 = null, _oscSub = null
let _filter = null, _pulseGain = null, _lfo = null, _lfoGain = null, _engineGain = null

// Gear state
let _currentGear  = 0
let _shiftUntil   = 0  // AudioContext time after which normal gain resumes

export function initEngineAudio() {
  const out = listener.gain

  _engineGain = ctx.createGain()
  _engineGain.gain.value = engineConfig.idleVol
  _engineGain.connect(out)

  _pulseGain = ctx.createGain()
  _pulseGain.gain.value = 1.0
  _pulseGain.connect(_engineGain)

  _lfo = ctx.createOscillator()
  _lfo.type = 'sine'
  _lfo.frequency.value = engineConfig.lfoIdleHz
  _lfoGain = ctx.createGain()
  _lfoGain.gain.value = engineConfig.lfoDepth
  _lfo.connect(_lfoGain)
  _lfoGain.connect(_pulseGain.gain)

  _filter = ctx.createBiquadFilter()
  _filter.type = 'lowpass'
  _filter.frequency.value = 260
  _filter.Q.value = engineConfig.filterQ
  _filter.connect(_pulseGain)

  _osc1 = ctx.createOscillator()
  _osc1.type = 'sawtooth'
  _osc1.frequency.value = engineConfig.idleHz
  _osc1.connect(_filter)

  _osc2 = ctx.createOscillator()
  _osc2.type = 'sawtooth'
  _osc2.frequency.value = engineConfig.idleHz * 2
  const g2 = ctx.createGain()
  g2.gain.value = 0.55
  _osc2.connect(g2)
  g2.connect(_filter)

  // Sub bypasses pulse gate — keeps the bass constant under the chug
  _oscSub = ctx.createOscillator()
  _oscSub.type = 'sine'
  _oscSub.frequency.value = engineConfig.idleHz * 0.5
  const gSub = ctx.createGain()
  gSub.gain.value = 0.4
  _oscSub.connect(gSub)
  gSub.connect(_engineGain)

  _osc1.start(); _osc2.start(); _oscSub.start(); _lfo.start()
}

export function setOscWaveform(layer, type) {
  if (layer === 1 && _osc1) _osc1.type = type
  if (layer === 2 && _osc2) _osc2.type = type
}

// Returns normalised RPM (0–1) that resets each gear, producing a sawtooth curve.
function gearRpm(t, gears, rpmLow, rpmHigh) {
  if (t <= 0) return rpmLow
  const band      = 1 / gears
  const gear      = Math.min(gears - 1, Math.floor(t / band))
  const progress  = (t - gear * band) / band   // 0–1 within this gear
  return rpmLow + progress * (rpmHigh - rpmLow)
}

export function updateEngineAudio(speed, maxSpeed) {
  if (!_engineGain) return

  const { idleHz, maxHz, idleVol, maxVol, smooth, filterQ,
          lfoIdleHz, lfoMaxHz, lfoDepth,
          gears, rpmLow, rpmHigh } = engineConfig

  const t    = Math.min(1, speed / maxSpeed)
  const now  = ctx.currentTime
  const rpm  = gearRpm(t, gears, rpmLow, rpmHigh)

  // ── Gear change detection ────────────────────────────────────────────────────
  const band = 1 / gears
  const gear = Math.min(gears - 1, Math.floor(t * gears))

  if (gear > _currentGear) {
    // Upshift: brief gain dip simulates clutch disengagement
    const targetVol = idleVol + t * (maxVol - idleVol)
    _engineGain.gain.cancelScheduledValues(now)
    _engineGain.gain.setValueAtTime(targetVol, now)
    _engineGain.gain.linearRampToValueAtTime(idleVol * 0.2, now + 0.03)
    _engineGain.gain.setTargetAtTime(targetVol, now + 0.05, 0.03)
    _shiftUntil = now + 0.15
  }
  _currentGear = gear

  // ── Oscillator pitch follows gear RPM, not raw speed ─────────────────────────
  const hz = idleHz + rpm * (maxHz - idleHz)
  _osc1.frequency.setTargetAtTime(hz,         now, smooth)
  _osc2.frequency.setTargetAtTime(hz * 2,     now, smooth)
  _oscSub.frequency.setTargetAtTime(hz * 0.5, now, smooth)

  _filter.frequency.setTargetAtTime(200 + rpm * 700, now, smooth)
  _filter.Q.value = filterQ

  // ── Volume uses raw speed (overall rise), skipping the dip window ────────────
  if (now >= _shiftUntil) {
    _engineGain.gain.setTargetAtTime(idleVol + t * (maxVol - idleVol), now, smooth)
  }

  const lfoHz = lfoIdleHz + rpm * (lfoMaxHz - lfoIdleHz)
  _lfo.frequency.setTargetAtTime(lfoHz,   now, smooth * 3)
  _lfoGain.gain.setTargetAtTime(lfoDepth, now, smooth)
}
