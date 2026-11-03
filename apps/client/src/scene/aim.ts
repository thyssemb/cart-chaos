import { CATALOG, selectAim, type AimProduct, type ProductType } from '@cart-chaos/shared'
import { Vector3, type Camera } from 'three'
import { aim } from '../views'

const direction = new Vector3()

export function refreshAim(
  camera: Camera,
  playerX: number,
  playerZ: number,
  products: readonly (AimProduct & { type: ProductType })[],
  enabled: boolean,
) {
  camera.getWorldDirection(direction)
  aim.ray = {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
    dx: direction.x,
    dy: direction.y,
    dz: direction.z,
  }
  if (!enabled) {
    aim.id = null
    aim.name = ''
    aim.ids = []
    aim.pin = null
    return
  }
  const pick = selectAim(aim.ray, playerX, playerZ, products)
  const spin = aim.wheel
  if (spin !== aim.applied) {
    const steps = Math.max(-3, Math.min(3, spin - aim.applied))
    aim.applied = spin
    if (pick.ids.length > 0) {
      const current = aim.pin && pick.ids.includes(aim.pin) ? aim.pin : pick.primaryId
      let index = Math.max(0, pick.ids.indexOf(current ?? ''))
      index = (index + steps) % pick.ids.length
      if (index < 0) index += pick.ids.length
      aim.pin = pick.ids[index] ?? null
    }
  } else if (!aim.pin || !pick.ids.includes(aim.pin)) {
    aim.pin = pick.primaryId
  } else if (pick.primaryId && pick.primaryId !== aim.pin) {
    const pinLat = pick.lateral[aim.pin] ?? 99
    const nextLat = pick.lateral[pick.primaryId] ?? 99
    if (nextLat + 0.08 < pinLat) aim.pin = pick.primaryId
  }
  aim.ids = pick.ids
  aim.id = aim.pin && pick.ids.includes(aim.pin) ? aim.pin : pick.primaryId
  const found = products.find((item) => item.id === aim.id)
  aim.name = found ? CATALOG[found.type].name : ''
}
