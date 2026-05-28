import * as THREE from 'three'

export const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('canvas'),
  antialias: true
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.shadowMap.enabled = true

export const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050012)

export const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)

// Very dim ambient — keeps the scene dark so neon edges pop
const ambient = new THREE.AmbientLight(0xffffff, 0.8)
scene.add(ambient)

// Faint cool fill from above, near-black from below
const hemi = new THREE.HemisphereLight(0x1a0a3a, 0x050010, 0.4)
scene.add(hemi)

// Subtle blue-purple key light for directional depth without washing out neon
export const sun = new THREE.DirectionalLight(0x5030cc, 0.35)
sun.position.set(80, 40, 60)
sun.castShadow = true
sun.shadow.camera.near = 1
sun.shadow.camera.far  = 400
sun.shadow.camera.left = sun.shadow.camera.bottom = -150
sun.shadow.camera.right = sun.shadow.camera.top   =  150
sun.shadow.mapSize.set(2048, 2048)
scene.add(sun)

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
})
