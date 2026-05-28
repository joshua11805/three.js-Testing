attribute float aHeight;
varying float vHeight;
varying vec3  vWorldPos;

void main() {
  vHeight   = aHeight;
  vWorldPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}