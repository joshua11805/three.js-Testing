// --- Tweak these values and save; Vite will hot-reload instantly ---
#define RIM_INTENSITY  0.35   // how bright the rim glow is (0.0 = off, 1.0 = full)
#define RIM_POWER      2.5    // sharpness of the rim edge (higher = thinner rim)
#define PULSE_SPEED    1.5    // animation cycles per second

uniform sampler2D uTexture;
uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec4 texColor = texture2D(uTexture, vUv);

  // Fresnel rim — bright at silhouette edges, dark at center
  float fresnel = 1.0 - max(dot(vNormal, vViewDir), 0.0);
  fresnel = pow(fresnel, RIM_POWER);

  // Animated color cycling between blue and orange
  float pulse = 0.5 + 0.5 * sin(uTime * PULSE_SPEED);
  vec3 rimColor = mix(vec3(0.0, 0.5, 1.0), vec3(1.0, 0.3, 0.0), pulse);

  vec3 finalColor = texColor.rgb + rimColor * fresnel * RIM_INTENSITY;
  gl_FragColor = vec4(finalColor, 1.0);
}
