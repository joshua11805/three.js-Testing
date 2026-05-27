uniform float     uTime;
uniform sampler2D uNormalMap;
uniform vec3      fogColor;
uniform float     fogNear;
uniform float     fogFar;
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
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv1 = vUv * 6.0 + vec2( uTime * 0.02,  uTime * 0.01);
  vec2 uv2 = vUv * 6.0 + vec2(-uTime * 0.015, uTime * 0.022);
  vec3 tn1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;
  vec3 tn2 = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;
  vec3 tn  = normalize(tn1 + tn2);

  vec3 N = normalize(vNormal + vec3(tn.x * 0.25, 0.0, tn.y * 0.25));

  vec3  viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = pow(1.0 - max(0.0, dot(viewDir, N)), 4.0);

  vec3 shallowColor = vec3(0.15, 0.58, 0.68);
  vec3 deepColor    = vec3(0.02, 0.10, 0.28);
  vec3 color        = mix(shallowColor, deepColor, fresnel * 0.6 + 0.2);

  vec3  sunDir  = normalize(vec3(0.4, 0.8, 0.3));
  vec3  halfVec = normalize(viewDir + sunDir);
  float spec    = pow(max(0.0, dot(N, halfVec)), 192.0) * 2.0;

  // Foam: layered snoise remapped to [0,1], masked to wave crests
  vec2  foamCoord = vWorldPos.xz * 0.5 + uTime * vec2(0.04, 0.025);
  float foamNoise = snoise(foamCoord)             * 0.6
                  + snoise(foamCoord * 2.1 + 2.3) * 0.3
                  + snoise(foamCoord * 4.3 + 7.1) * 0.1;
  foamNoise = foamNoise * 0.5 + 0.5;

  // vWaveHeight is in roughly [-0.45, 0.45] — threshold at upper portion
  float foam = smoothstep(0.18, 0.32, vWaveHeight) * smoothstep(0.25, 0.45, foamNoise);

  color = color + spec + foam * 0.7;

  float edgeFade = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x)
                 * smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.95, vUv.y);

  float alpha = mix(0.55, 0.92, fresnel) * edgeFade;

  float fogDepth  = length(vWorldPos - cameraPosition);
  float fogFactor = smoothstep(fogNear, fogFar, fogDepth);
  color = mix(color, fogColor, fogFactor);
  alpha *= (1.0 - fogFactor);

  gl_FragColor = vec4(color, alpha);
}
