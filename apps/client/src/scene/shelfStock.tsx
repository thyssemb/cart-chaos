import { HOMES, SHELF_INSET, SHELF_TOPS, SHELVES } from '@cart-chaos/shared'
import { Suspense, useMemo } from 'react'
import type { Mesh, Object3D } from 'three'
import { shelfFacing, useFoodScene } from './foodPack'

const MODEL_HEIGHT: Record<string, number> = {
  milk: 0.5,
  bread: 0.4,
  eggs: 0.4,
  cheese: 0.34,
  banana: 0.5,
  cereal: 0.56,
  drink: 0.52,
  frozen: 0.4,
  chips: 0.3,
}

interface Spot {
  model: string
  x: number
  y: number
  z: number
  yaw: number
}

function filler(shelfId: string, index: number) {
  if (shelfId === 'r2' && index % 5 === 0) return 'drink'
  if (shelfId === 'r4' && index % 6 === 0) return 'chips'
  if (shelfId === 'promo' && index % 6 === 0) return 'chips'
  if (shelfId === 'frais' && index % 5 === 0) return 'cheese'
  if (shelfId === 'fruits') return 'banana'
  if (shelfId === 'frozen') return 'frozen'
  if (shelfId === 'r3') return 'cereal'
  return 'bread'
}

function buildSpots(): Spot[] {
  const spots: Spot[] = []
  let index = 0
  for (const shelf of SHELVES) {
    if (shelf.kind === 'checkout') continue
    const alongZ = shelf.kind === 'gondola' || shelf.kind === 'promo'
    const sides: Array<'s' | 'e' | 'w'> = alongZ ? (shelf.kind === 'promo' ? ['w'] : ['e', 'w']) : ['s']
    const count = alongZ ? 9 : 8
    for (const side of sides) {
      for (const top of SHELF_TOPS) {
        for (let i = 0; i < count; i += 1) {
          const t = (i + 0.5) / count
          const model = filler(shelf.id, index)
          index += 1
          const height = MODEL_HEIGHT[model] ?? 0.4
          const y = top + height / 2
          const x = side === 'e' ? shelf.x + shelf.w / 2 - SHELF_INSET : side === 'w' ? shelf.x - shelf.w / 2 + SHELF_INSET : shelf.x + (t - 0.5) * shelf.w
          const z = side === 's' ? shelf.z - shelf.d / 2 + SHELF_INSET : shelf.z + (t - 0.5) * shelf.d
          const blocked = HOMES.some((home) => Math.abs(home.y - y) < 0.28 && Math.hypot(home.x - x, home.z - z) < 0.58)
          if (blocked) continue
          spots.push({ model, x, y, z, yaw: shelfFacing(x, z) })
        }
      }
    }
  }
  return spots
}

function StockMeshes() {
  const { scene } = useFoodScene()
  const spots = useMemo(() => buildSpots(), [])
  const clones = useMemo(() => {
    const objects: Object3D[] = []
    for (const spot of spots) {
      const source = scene.getObjectByName(spot.model)
      if (!source) continue
      const copy = source.clone(true)
      copy.position.set(spot.x, spot.y, spot.z)
      copy.rotation.set(0, spot.yaw, 0)
      copy.traverse((child) => {
        const mesh = child as Mesh
        if (!mesh.isMesh) return
        mesh.castShadow = true
        mesh.receiveShadow = true
      })
      objects.push(copy)
    }
    return objects
  }, [scene, spots])
  return (
    <group>
      {clones.map((object, index) => (
        <primitive key={index} object={object} />
      ))}
    </group>
  )
}

export function ShelfStock() {
  return (
    <Suspense fallback={null}>
      <StockMeshes />
    </Suspense>
  )
}
