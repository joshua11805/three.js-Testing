uniform float uTime;
varying vec2  vUv;
varying vec3  vWorldPos;
varying vec3  vNormal;
varying float vWaveHeight;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1  = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                 + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                           dot(x12.zw,x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x  = 2.0 * fract(p * C.www) - 1.0;
  vec3 h  = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x   + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g); // returns [-1, 1]
}

float waveHeight(vec2 p) {
  return snoise(p * 0.06 + uTime * vec2( 0.30,  0.20)) * 0.22
       + snoise(p * 0.13 + uTime * vec2(-0.20,  0.28)) * 0.13
       + snoise(p * 0.28 + uTime * vec2( 0.15, -0.18)) * 0.07
       + snoise(p * 0.55 + uTime * vec2( 0.22,  0.12)) * 0.03;
}

void main() {
  vUv = uv;
  vec2 wp = (modelMatrix * vec4(position, 1.0)).xz;

  float h  = waveHeight(wp);
  float hx = waveHeight(wp + vec2(0.5, 0.0));
  float hz = waveHeight(wp + vec2(0.0, 0.5));

  vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
  p.y   += h;

  vWorldPos   = p;
  vWaveHeight = h;
  vNormal     = normalize(vec3(h - hx, 0.5, h - hz));

  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
