uniform sampler2D tDiffuse;
uniform float     uTime;
uniform float     uDepth;
varying vec2      vUv;

void main() {
  // Slow, large-scale wobble — 1-2 waves across the screen, not a busy pattern
  float strength = min(uDepth * 0.0015, 0.010);
  vec2 offset = vec2(
    sin(vUv.y * 2.5 + uTime * 0.5) * strength,
    cos(vUv.x * 2.0 + uTime * 0.4) * strength
  );

  vec3 scene = texture2D(tDiffuse, vUv + offset).rgb;

  // Tint by multiplying channels — red pulled down, blue lifted slightly
  // This gives a clean cool blue look without any flickering
  float tint  = clamp(uDepth * 0.04 + 0.3, 0.3, 0.7);
  scene.r    *= 1.0 - tint * 0.6;
  scene.g    *= 1.0 - tint * 0.2;
  scene.b    *= 1.0 + tint * 0.1;

  // Depth darkening
  scene *= 1.0 - clamp(uDepth * 0.035, 0.0, 0.5);

  // Soft vignette to frame the underwater view
  float dist    = length(vUv - 0.5) * 1.6;
  float vignette = smoothstep(1.0, 0.4, dist);
  scene         *= mix(0.7, 1.0, vignette);

  gl_FragColor = vec4(scene, 1.0);
}
