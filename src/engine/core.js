//handles basic three.js logic such as renderer, scene
//
import * as THREE from 'three'

export const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('canvas'),
  antialias: true
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.shadowMap.enabled = true

export const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb)

export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

const ambient = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambient)

export const sun = new THREE.DirectionalLight(0xffffff, 1)
sun.position.set(10, 20, 10)
sun.castShadow = true
scene.add(sun)

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
})
