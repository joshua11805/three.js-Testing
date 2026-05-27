import { WaterMesh } from './waterMesh.js'
import { CHUNK_SIZE } from '../chunkMesh.js'

const WATER_SIZE = 12 * CHUNK_SIZE  // covers full load radius with buffer

export class WaterManager {
  constructor(scene, waterLevel) {
    this.scene      = scene
    this.waterLevel = waterLevel
    this._mesh      = new WaterMesh(WATER_SIZE, waterLevel)
    scene.add(this._mesh.mesh)
  }

  update(playerPosition, time) {
    // Snap to chunk grid so the plane doesn't visibly slide under the player
    const snapX = Math.round(playerPosition.x / CHUNK_SIZE) * CHUNK_SIZE
    const snapZ = Math.round(playerPosition.z / CHUNK_SIZE) * CHUNK_SIZE
    this._mesh.mesh.position.set(snapX, this.waterLevel, snapZ)
    this._mesh.update(time)
  }
}
