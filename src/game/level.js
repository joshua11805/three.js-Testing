import * as THREE from 'three'
import { scene } from '../engine/core.js'
import { PhysicsBody, addBody, removeBody } from '../engine/physics.js'
import { createEntity, addComponent } from '../engine/ecs.js'
import { createShaderMaterial } from '../engine/shaderSystem.js'
import { terrainHeight } from '../engine/terrain/noise.js'
import ballVert from './shaders/ball.vert?raw'
import ballFrag from './shaders/ball.frag?raw'

// Balls
const ballGeometry = new THREE.SphereGeometry(0.5, 16, 16)
const soccerTexture = new THREE.TextureLoader().load(
  '/textures/soccer.png.jpg',
  null,
  null,
  () => console.error('Failed to load soccer texture — check the file is at public/textures/soccer.png')
)
soccerTexture.colorSpace = THREE.SRGBColorSpace

const ballMaterial = createShaderMaterial(ballVert, ballFrag, {
  uTexture: { value: soccerTexture },
})

function spawnBall(position) {
  const mesh = new THREE.Mesh(ballGeometry, ballMaterial)
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
  addComponent(id, 'Shader',  ballMaterial)
  addComponent(id, 'Physics', { body },        () => removeBody(body))
  addComponent(id, 'Mesh',    { object: mesh }, () => { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose() })
  return id
}

// Spawn balls just above terrain height so they land naturally
for (let i = 0; i < 30; i++) {
  const x = (Math.random() - 0.5) * 60
  const z = (Math.random() - 0.5) * 60
  spawnBall(new THREE.Vector3(x, terrainHeight(x, z) + 5 + i * 0.5, z))
}
