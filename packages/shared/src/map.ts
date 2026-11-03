import type { ProductType } from './constants'

export interface Obstacle {
  id: string
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

function spot(shelfId: string, side: 'n' | 's' | 'e' | 'w', t: number, y: number) {
  const shelf = SHELVES.find((s) => s.id === shelfId)
  if (!shelf) throw new Error(`Rayon inconnu ${shelfId}`)
  const b = shelfBounds(shelf)
  const u = Math.min(0.92, Math.max(0.08, t))
  if (side === 's') return { x: b.minX + (b.maxX - b.minX) * u, y, z: b.minZ - 0.28 }
  if (side === 'n') return { x: b.minX + (b.maxX - b.minX) * u, y, z: b.maxZ + 0.28 }
  if (side === 'e') return { x: b.maxX + 0.28, y, z: b.minZ + (b.maxZ - b.minZ) * u }
  return { x: b.minX - 0.28, y, z: b.minZ + (b.maxZ - b.minZ) * u }
}

function add(homes: Home[], type: ProductType, shelf: string, side: 'n' | 's' | 'e' | 'w', t: number, y: number) {
  const n = homes.filter((h) => h.type === type).length
  const p = spot(shelf, side, t, y)
  homes.push({ id: `${type}-${n}`, type, ...p })
}

function buildHomes(): Home[] {
  const homes: Home[] = []
  add(homes, 'banana', 'fruits', 's', 0.22, 1.12)
  add(homes, 'banana', 'fruits', 's', 0.5, 1.12)
  add(homes, 'banana', 'fruits', 's', 0.78, 1.12)
  add(homes, 'milk', 'frais', 's', 0.18, 1.18)
  add(homes, 'milk', 'frais', 's', 0.4, 1.18)
  add(homes, 'milk', 'frais', 's', 0.62, 1.18)
  add(homes, 'eggs', 'frais', 's', 0.18, 1.62)
  add(homes, 'eggs', 'frais', 's', 0.4, 1.62)
  add(homes, 'eggs', 'frais', 's', 0.62, 1.62)
  add(homes, 'cheese', 'frais', 's', 0.74, 1.18)
  add(homes, 'cheese', 'frais', 's', 0.86, 1.18)
  add(homes, 'cheese', 'frais', 's', 0.8, 1.62)
  add(homes, 'bread', 'r1', 'e', 0.22, 1.15)
  add(homes, 'bread', 'r1', 'e', 0.5, 1.15)
  add(homes, 'bread', 'r1', 'e', 0.78, 1.15)
  add(homes, 'drink', 'r2', 'e', 0.22, 1.12)
  add(homes, 'drink', 'r2', 'e', 0.5, 1.12)
  add(homes, 'drink', 'r2', 'e', 0.78, 1.12)
  add(homes, 'cereal', 'r3', 'e', 0.28, 1.2)
  add(homes, 'cereal', 'r3', 'e', 0.55, 1.2)
  add(homes, 'cereal', 'r3', 'e', 0.8, 1.2)
  add(homes, 'toilet', 'r4', 'w', 0.25, 1.05)
  add(homes, 'toilet', 'r4', 'w', 0.5, 1.05)
  add(homes, 'toilet', 'r4', 'w', 0.75, 1.05)
  add(homes, 'frozen', 'frozen', 's', 0.25, 1.2)
  add(homes, 'frozen', 'frozen', 's', 0.5, 1.2)
  add(homes, 'frozen', 'frozen', 's', 0.75, 1.2)
  const legend = spot('promo', 'w', 0.62, 1.28)
  homes.push({ id: 'legendary', type: 'legendary', ...legend })
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
  return [(col - 1.5) * 0.16, 0.58, row === 0 ? 0.1 : -0.12]
})
