import * as THREE from 'three'
import { scene, camera } from './core.js'

// Clear the solid background colour — the sky mesh covers it entirely.
scene.background = null

const _vert = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir        = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const _frag = /* glsl */`
  uniform float uTime;
  varying vec3  vDir;

  float hash(vec2 p) {
    p  = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 74.27);
    return fract(p.x * p.y);
  }

  void main() {
    vec3  d = normalize(vDir);
    float y = d.y;

    // ── Sky gradient ──────────────────────────────────────────────────────────
    vec3 zenith = vec3(0.01, 0.00, 0.05);   // near-black at top
    vec3 mid    = vec3(0.04, 0.00, 0.14);   // deep purple
    vec3 horiz  = vec3(0.40, 0.02, 0.24);   // dark magenta at horizon

    vec3 sky = mix(horiz, mid,    smoothstep(0.00, 0.35, y));
    sky      = mix(sky,   zenith, smoothstep(0.30, 0.90, y));

    // Horizon glow band
    float glow = exp(-abs(y) * 10.0) * 0.8;
    sky += vec3(0.55, 0.03, 0.32) * glow;

    // ── Retro sun ─────────────────────────────────────────────────────────────
    // Fixed world-space direction: just above the horizon, straight ahead (-Z).
    vec3  sunDir  = normalize(vec3(0.0, 0.05, -1.0));
    float sunR    = 0.20;   // half-angle radius in radians (~11 degrees)
    float sunDist = acos(clamp(dot(d, sunDir), -1.0, 1.0));
    float inDisk  = 1.0 - smoothstep(sunR - 0.004, sunR + 0.004, sunDist);

    // Vertical position inside disk: -1 = top edge, +1 = bottom edge
    float diskY = (sunDir.y - d.y) / sunR;
    float normY = clamp(diskY * 0.5 + 0.5, 0.0, 1.0);

    // Warm orange-yellow at top, magenta at bottom
    vec3 sunTop  = vec3(1.00, 0.72, 0.15);
    vec3 sunBot  = vec3(0.15, 0.08, 0.55);
    vec3 sunBody = mix(sunTop, sunBot, normY);

    // Horizontal scanlines, denser toward the bottom
    float density  = 3.0 + normY * 13.0;   // 13 lines at top, 31 at bottom
    float lineV    = fract(diskY * density);
    float gapWidth = 0.38 + normY * 0.15;   // wider gap (more black) lower down
    float line     = step(gapWidth, lineV);
    float lineArea = smoothstep(0.10, 0.50, normY);  // stripes only in lower half
    float sunMask  = mix(1.0, line, lineArea);

    //only draw sun where stripes exist, gaps reveal sky behind it
    float visibleSun = inDisk *  sunMask;
    sky = mix(sky, sunBody, visibleSun);

    // Corona glow
    float corona = exp(-sunDist * 4.5) * 0.55;
    sky += vec3(0.70, 0.10, 0.45) * corona;

    // Composite sun over sky
    //sky = mix(sky, sunBody * sunMask, inDisk);

    // ── Stars ─────────────────────────────────────────────────────────────────
    float starFade = smoothstep(0.04, 0.22, y);
    float phi      = atan(d.x, d.z);
    float theta    = asin(clamp(d.y, -0.999, 0.999));
    vec2  uv       = vec2(phi, theta) * 7.0;
    vec2  cell     = floor(uv);
    vec2  local    = fract(uv);
    float h1 = hash(cell);
    float h2 = hash(cell + vec2(3.1,  7.4));
    float h3 = hash(cell + vec2(13.7, 2.3));
    float hasStar  = step(0.70, h3);
    float starSize = 0.03 + h1 * 0.04;
    float star     = smoothstep(starSize, 0.0, length(local - vec2(h1, h2)));
    sky += vec3(0.80, 0.75, 0.45) * star * hasStar * starFade;

    gl_FragColor = vec4(sky, 1.0);
  }
`

const _mat = new THREE.ShaderMaterial({
  vertexShader   : _vert,
  fragmentShader : _frag,
  uniforms       : { uTime: { value: 0 } },
  side           : THREE.BackSide,
  depthWrite     : false,
})

const _mesh = new THREE.Mesh(
  new THREE.SphereGeometry(900, 32, 16),
  _mat
)
_mesh.renderOrder = -1
scene.add(_mesh)

export function updateSky(delta) {
  _mat.uniforms.uTime.value += delta
  _mesh.position.copy(camera.position)
}
