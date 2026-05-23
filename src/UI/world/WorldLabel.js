import * as THREE from 'three'
import { scene } from '../../engine/core.js'

export class WorldLabel {
  constructor(text, position, { scale = 1, color = '#ffffff', fontSize = 32 } = {}) {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64

    const ctx = canvas.getContext('2d')
    ctx.font = `bold ${fontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeStyle = 'rgba(0,0,0,0.8)'
    ctx.lineWidth = 6
    ctx.strokeText(text, 128, 32)
    ctx.fillStyle = color
    ctx.fillText(text, 128, 32)

    const texture  = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    })

    this.sprite = new THREE.Sprite(material)
    this.sprite.position.copy(position)
    this.sprite.scale.set(scale * 2, scale * 0.5, 1)
    this.sprite.renderOrder = 999
    scene.add(this.sprite)

    this.done = false
  }

  update(_delta) {}

  destroy() {
    scene.remove(this.sprite)
    this.sprite.material.map.dispose()
    this.sprite.material.dispose()
  }
}
