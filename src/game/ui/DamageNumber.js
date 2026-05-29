import { WorldLabel } from '../../UI/world/WorldLabel.js'

export class DamageNumber extends WorldLabel {
  constructor(amount, position) {
    super(`-${amount}`, position.clone(), { color: '#ff4444', scale: 1 })
    this.elapsed  = 0
    this.duration = 1.2
    this.startY   = position.y
  }

  update(delta) {
    this.elapsed += delta
    const t = this.elapsed / this.duration
    this.sprite.position.y       = this.startY + t * 2
    this.sprite.material.opacity = 1 - t
    if (this.elapsed >= this.duration) this.done = true
  }
}
