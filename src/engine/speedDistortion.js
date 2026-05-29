import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { addPostPass } from './postProcessing.js'

// Speed thresholds (match car.js MAX_SPEED = 45)
const SPEED_START  = 35   // effect begins
const SPEED_FULL   = 45   // intensity reaches 1.0
const RAMP_UP      = 6.8
const RAMP_DOWN    = 5.0

const _shader = {
  uniforms: {
    tDiffuse:   { value: null },
    uIntensity: { value: 0 },
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uIntensity;
    varying vec2 vUv;

    void main() {
      vec4 base = texture2D(tDiffuse, vUv);

      if (uIntensity < 0.01) {
        gl_FragColor = base;
        return;
      }

      vec2  center = vec2(0.5);
      vec2  delta  = vUv - center;
      float dist   = length(delta);

      // Safe normalized direction — epsilon prevents NaN at screen center.
      vec2  dir    = delta / (dist + 0.0001);

      //edge weighting
      float edge = pow(smoothstep(0.12, 0.95, dist), 2.0);

      //blur strength (weight toward edges)
      float bs = uIntensity * 0.9 * edge;

      // Radial zoom blur — unrolled for maximum GLSL compatibility.
      // Samples pull inward toward screen center, smearing edges outward.

      vec4 col = vec4(0.0);
      col += texture2D(tDiffuse, vUv - delta * (bs * 0.000));
      col += texture2D(tDiffuse, vUv - delta * (bs * 0.143));
      col += texture2D(tDiffuse, vUv - delta * (bs * 0.286));
      col += texture2D(tDiffuse, vUv - delta * (bs * 0.429));
      col += texture2D(tDiffuse, vUv - delta * (bs * 0.571));
      col += texture2D(tDiffuse, vUv - delta * (bs * 0.714));
      col += texture2D(tDiffuse, vUv - delta * (bs * 0.857));
      col += texture2D(tDiffuse, vUv - delta * (bs * 1.000));
      col /= 8.0;

      // Chromatic aberration — R pushed out, B pulled in, G from blur. ( also edge weighted )
      float ca = uIntensity * 0.018 * dist * edge;
      float r  = texture2D(tDiffuse, vUv + dir * ca).r;
      float g  = col.g;
      float b  = texture2D(tDiffuse, vUv - dir * ca * 0.6).b;

      // Radial vignette — squared distance darkens corners. (edge weighted)
      float vig = 1.0 - edge * uIntensity * 1.8;

      gl_FragColor = vec4(r, g, b, 1.0) * clamp(vig, 0.1, 1.0);
    }
  `,
}

const _pass = new ShaderPass(_shader)
addPostPass(_pass)
console.log('[speedDistortion] pass added to composer, passes:', _pass)

let _intensity  = 0
let _didLog     = false

export function updateSpeedDistortion(speed, delta) {
  const target  = Math.max(0.0, Math.min(1.0, (speed - SPEED_START) / (SPEED_FULL - SPEED_START)))
  const rate    = target > _intensity ? RAMP_UP : RAMP_DOWN
  _intensity   += (target - _intensity) * Math.min(1.0, rate * delta)

  if (!_didLog && _intensity > 0.05) {
    console.log('[speedDistortion] effect active — intensity:', _intensity.toFixed(3), 'speed:', speed.toFixed(1))
    _didLog = true
  }

  _pass.uniforms.uIntensity.value = _intensity
}
