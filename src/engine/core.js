import * as THREE from 'three'

export const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('canvas'),
  antialias: true
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.shadowMap.enabled = true

export const scene = new THREE.Scene()
scene.background = new THREE.Color(0xf07030)

export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

// Very dim warm ambient — lifts pitch-black shadows without washing out colour
const ambient = new THREE.AmbientLight(0xffccaa, 0.06)
scene.add(ambient)

// Hemisphere kept subtle so terrain colours still read — just warms upward faces
const hemi = new THREE.HemisphereLight(0xffaa55, 0x1a0d06, 0.3)
scene.add(hemi)

// Low sun near the horizon — warm orange, grazing angle for long shadows
export const sun = new THREE.DirectionalLight(0xffccaa, 1.6)
sun.position.set(150, 12, 40)
sun.castShadow = true
sun.shadow.camera.near = 1
sun.shadow.camera.far  = 600
sun.shadow.camera.left = sun.shadow.camera.bottom = -200
sun.shadow.camera.right = sun.shadow.camera.top   =  200
sun.shadow.mapSize.set(2048, 2048)
scene.add(sun)

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
})
