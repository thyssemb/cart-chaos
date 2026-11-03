import type { ProductType } from './constants'

export interface Obstacle {
  id: string
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface Bounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface ShelfDef {
  id: string
  x: number
  z: number
  w: number
  d: number
  h: number
  kind: 'produce' | 'fridge' | 'freezer' | 'gondola' | 'promo' | 'checkout'
  color: string
  trim: string
  label: string
}

export const STORE = {
  minX: -17,
  maxX: 17,
  minZ: -13.4,
  maxZ: 13.2,
}

export const SHELVES: ShelfDef[] = [
  { id: 'fruits', x: -11.6, z: 10.55, w: 7.4, d: 2.7, h: 0.95, kind: 'produce', color: '#b6ee9a', trim: '#ef6f4d', label: 'FRUITS' },
  { id: 'frais', x: -1.0, z: 10.55, w: 6.6, d: 2.5, h: 2.15, kind: 'fridge', color: '#ff6b6b', trim: '#e7f7ff', label: 'FRAIS' },
  { id: 'frozen', x: 10.2, z: 10.55, w: 6.8, d: 2.5, h: 1.7, kind: 'freezer', color: '#8fd3ff', trim: '#f3fbff', label: 'SURGELÉS' },
  { id: 'r1', x: -13.15, z: -0.55, w: 2.25, d: 8.0, h: 1.65, kind: 'gondola', color: '#f3d7b0', trim: '#7ed9a5', label: 'RAYON 1' },
  { id: 'r2', x: -6.55, z: -0.55, w: 2.25, d: 8.0, h: 1.65, kind: 'gondola', color: '#f3d7b0', trim: '#7ec8e3', label: 'RAYON 2' },
  { id: 'r3', x: 0.15, z: -0.55, w: 2.25, d: 8.0, h: 1.65, kind: 'gondola', color: '#f3d7b0', trim: '#f2c14e', label: 'RAYON 3' },
  { id: 'r4', x: 6.85, z: -0.55, w: 2.25, d: 8.0, h: 1.65, kind: 'gondola', color: '#f3d7b0', trim: '#ff8fab', label: 'RAYON 4' },
  { id: 'promo', x: 13.35, z: 0.35, w: 2.15, d: 9.2, h: 1.55, kind: 'promo', color: '#ffd23f', trim: '#ff5d6c', label: 'PROMO' },
  { id: 'c1', x: -11.6, z: -12.05, w: 3.5, d: 1.2, h: 1.05, kind: 'checkout', color: '#f7fff9', trim: '#2ec4b6', label: 'CAISSE 1' },
  { id: 'c2', x: -3.9, z: -12.05, w: 3.5, d: 1.2, h: 1.05, kind: 'checkout', color: '#f7fff9', trim: '#2ec4b6', label: 'CAISSE 2' },
  { id: 'c3', x: 3.8, z: -12.05, w: 3.5, d: 1.2, h: 1.05, kind: 'checkout', color: '#f7fff9', trim: '#2ec4b6', label: 'CAISSE 3' },
]

export function shelfBounds(s: ShelfDef): Obstacle {
  return {
    id: s.id,
    minX: s.x - s.w / 2,
    maxX: s.x + s.w / 2,
    minZ: s.z - s.d / 2,
    maxZ: s.z + s.d / 2,
  }
}

export const OBSTACLES: Obstacle[] = SHELVES.map(shelfBounds)

export interface Zone {
  id: number
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export const CHECKOUTS: Zone[] = [
  { id: 1, minX: -13.7, maxX: -9.5, minZ: -11.35, maxZ: -9.35 },
  { id: 2, minX: -6.0, maxX: -1.8, minZ: -11.35, maxZ: -9.35 },
  { id: 3, minX: 1.7, maxX: 5.9, minZ: -11.35, maxZ: -9.35 },
]

export interface Spawn {
  x: number
  z: number
  yaw: number
}

export const SPAWNS: Spawn[] = [
  { x: -3.15, z: -6.85, yaw: 0.02 },
  { x: -4.9, z: -5.2, yaw: 2.55 },
  { x: 3.5, z: -6.6, yaw: 0.04 },
  { x: -1.45, z: -6.9, yaw: -0.08 },
  { x: 1.2, z: -6.85, yaw: 0.1 },
  { x: 5.3, z: -6.3, yaw: 0.08 },
]

export interface Home {
  id: string
  type: ProductType
  x: number
  y: number
  z: number
}

/** Top face of each shelf board, in metres. Shared by the visuals and the product spots. */
export const SHELF_TOPS = [0.4, 1.0, 1.72] as const

/** How far a product sits in from the aisle face, still on the board. */
export const SHELF_INSET = 0.42

/** Baked height of each product, matching tools/trim-food-pack.py. */
export const PRODUCT_HEIGHT: Record<ProductType, number> = {
  milk: 0.5,
  bread: 0.4,
  eggs: 0.4,
  cheese: 0.34,
  banana: 0.5,
  cereal: 0.56,
  drink: 0.52,
  toilet: 0.38,
  frozen: 0.4,
  legendary: 0.42,
}

function buildHomes(): Home[] {
  const homes: Home[] = []
  const put = (type: ProductType, shelfId: string, side: 's' | 'e' | 'w', level: 0 | 1 | 2, slots: number[]) => {
    const shelf = SHELVES.find((item) => item.id === shelfId)
    if (!shelf) throw new Error(`Rayon inconnu ${shelfId}`)
    const bounds = shelfBounds(shelf)
    const y = SHELF_TOPS[level] + PRODUCT_HEIGHT[type] / 2
    for (const t of slots) {
      const n = homes.filter((home) => home.type === type).length
      const alongX = bounds.minX + (bounds.maxX - bounds.minX) * t
      const alongZ = bounds.minZ + (bounds.maxZ - bounds.minZ) * t
      const x = side === 'e' ? bounds.maxX - SHELF_INSET : side === 'w' ? bounds.minX + SHELF_INSET : alongX
      const z = side === 's' ? bounds.minZ + SHELF_INSET : alongZ
      homes.push({ id: type === 'legendary' ? 'legendary' : `${type}-${n}`, type, x, y, z })
    }
  }
  put('banana', 'fruits', 's', 1, [0.28, 0.5, 0.72])
  put('cheese', 'frais', 's', 0, [0.22, 0.4, 0.58])
  put('milk', 'frais', 's', 1, [0.28, 0.5, 0.72])
  put('eggs', 'frais', 's', 2, [0.28, 0.5, 0.72])
  put('bread', 'r1', 'e', 1, [0.32, 0.5, 0.68])
  put('drink', 'r2', 'e', 1, [0.32, 0.5, 0.68])
  put('cereal', 'r3', 'e', 1, [0.32, 0.5, 0.68])
  put('toilet', 'r4', 'w', 1, [0.32, 0.5, 0.68])
  put('frozen', 'frozen', 's', 1, [0.28, 0.5, 0.72])
  put('legendary', 'promo', 'w', 2, [0.55])
  return homes
}

export const HOMES: Home[] = buildHomes()

export const LEGENDARY_HOME = HOMES.find((h) => h.type === 'legendary')!

export function zoneAt(x: number, z: number): Zone | null {
  for (const zone of CHECKOUTS) {
    if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) return zone
  }
  return null
}

export function checkoutReady(px: number, pz: number, cx: number, cz: number): number | null {
  const zone = zoneAt(cx, cz)
  if (!zone) return null
  if (Math.hypot(px - cx, pz - cz) > 2.5) return null
  if (pz > -8.7) return null
  return zone.id
}

export const CART_SLOTS: [number, number, number][] = Array.from({ length: 8 }, (_, i) => {
  const col = i % 4
  const row = Math.floor(i / 4)
  return [(col - 1.5) * 0.24, 0.6, row === 0 ? 0.16 : -0.18]
})
