import * as THREE from 'three'
import { scene } from '../engine/core.js'
import { PhysicsBody, addBody, removeBody } from '../engine/physics.js'
import { createEntity, addComponent } from '../engine/ecs.js'
import { initSky } from '../engine/sky.js'

initSky()

// Floor
const floorGeometry = new THREE.BoxGeometry(50, 0.2, 50)
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x3a7d44 })
const floor = new THREE.Mesh(floorGeometry, floorMaterial)
floor.position.y = -0.1
floor.receiveShadow = true
scene.add(floor)

addBody(new PhysicsBody({
  type: 'box',
  isStatic: true,
  position: floor.position,
  halfSize: new THREE.Vector3(25, 0.1, 25)
}))

// Walls
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 })

function createWall(position, size) {
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z)
  const wall = new THREE.Mesh(geometry, wallMaterial)
  wall.position.copy(position)
  wall.castShadow = true
  wall.receiveShadow = true
  scene.add(wall)

  addBody(new PhysicsBody({
    type: 'box',
    isStatic: true,
    position: wall.position,
    halfSize: new THREE.Vector3(size.x / 2, size.y / 2, size.z / 2)
  }))

  return wall
}

const wallHeight = 2
const wallThickness = 0.5
const arenaSize = 10

createWall(new THREE.Vector3(-5, wallHeight / 2, 0), new THREE.Vector3(wallThickness, wallHeight, arenaSize))  // left
createWall(new THREE.Vector3( 5, wallHeight / 2, 0), new THREE.Vector3(wallThickness, wallHeight, arenaSize))  // right
createWall(new THREE.Vector3( 0, wallHeight / 2, -5), new THREE.Vector3(arenaSize, wallHeight, wallThickness)) // back
createWall(new THREE.Vector3( 0, wallHeight / 2,  5), new THREE.Vector3(arenaSize, wallHeight, wallThickness)) // front

// Balls
const ballGeometry = new THREE.SphereGeometry(0.5, 16, 16)
const soccerTexture = new THREE.TextureLoader().load(
  '/textures/soccer.png.jpg',
  null,
  null,
  () => console.error('Failed to load soccer texture — check the file is at public/textures/soccer.png')
)
soccerTexture.colorSpace = THREE.SRGBColorSpace

function spawnBall(position) {
  const material = new THREE.MeshBasicMaterial({ map: soccerTexture })
  const mesh = new THREE.Mesh(ballGeometry, material)
  mesh.castShadow = true
  scene.add(mesh)

  const body = new PhysicsBody({ type: 'sphere', mass: 1, position, radius: 0.5 })
  body.velocity.set(
    (Math.random() - 0.5) * 5,
    Math.random() * 5,
    (Math.random() - 0.5) * 5
  )

  addBody(body, mesh)

  const id = createEntity()
  addComponent(id, 'Ball',    {})
  addComponent(id, 'Physics', { body },        () => removeBody(body))
  addComponent(id, 'Mesh',    { object: mesh }, () => { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose() })
  return id
}

for (let i = 0; i < 30; i++) {
  spawnBall(new THREE.Vector3(
    (Math.random() - 0.5) * 8,
    5 + i * 1.2,
    (Math.random() - 0.5) * 8
  ))
}
