uniform float uTime;
varying float vHeight;

vec3 neonPulse(vec3 colorA, vec3 colorB, float speed, float offset) {
  float t = sin(uTime * speed + offset) * 0.5 + 0.5;
  return mix(colorA, colorB, t);
}

void main() {
  vec3 color;

  if (vHeight < -3.0) {
    // Sand — cyan to magenta
    color = neonPulse(
      vec3(0.0, 1.0, 1.0),   // cyan
      vec3(1.0, 0.0, 1.0),   // magenta
      1.2, 0.0
    );
  } else if (vHeight < 6.0) {
    // Grass — green to yellow
    color = neonPulse(
      vec3(0.0, 1.0, 0.2),   // neon green
      vec3(1.0, 1.0, 0.0),   // yellow
      0.8, 1.0
    );
  } else if (vHeight < 15.0) {
    // Rock — purple to pink
    color = neonPulse(
      vec3(0.6, 0.0, 1.0),   // purple
      vec3(1.0, 0.0, 0.5),   // hot pink
      1.5, 2.0
    );
  } else {
    // Snow — electric blue to white
    color = neonPulse(
      vec3(0.2, 0.5, 1.0),   // electric blue
      vec3(1.0, 1.0, 1.0),   // white flash
      2.0, 3.0
    );
  }

  // Add emissive rim glow at band boundaries
  float bandEdge = abs(sin(vHeight * 0.8)) ;
  color += vec3(bandEdge * 0.15);

  gl_FragColor = vec4(color, 1.0);
}