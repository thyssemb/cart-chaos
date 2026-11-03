import { INTERACT_RANGE } from './constants'
import { SHELVES, shelfBounds } from './map'

/** Same reach the old nearest-item pickup used, so a carton on a board stays grabbable. */
export const AIM_REACH = INTERACT_RANGE + 0.75

/** A ray this close to a product center counts as aiming at it. */
export const AIM_PRIMARY_LATERAL = 0.48

/** Neighbours of the aimed product that the wheel may cycle through. */
export const AIM_CLUSTER_LATERAL = 1.65
export const AIM_CLUSTER_GAP = 1.75

export const AIM_MIN_T = 0.35
export const AIM_MAX_T = 14

/**
 * How far the camera ray may travel inside a product's own shelf before the
 * rack counts as hiding it. The front face is about 0.42 m in; the back is ~1.8 m.
 */
export const OWN_SHELF_HIDE = 1.05

const SHELF_SOLID_TOP = 2.4

export interface AimRay {
  x: number
  y: number
  z: number
  dx: number
  dy: number
  dz: number
}

export interface AimProduct {
  id: string
  x: number
  y: number
  z: number
}

export interface ShelfSolid {
  id: string
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

export interface AimPick {
  primaryId: string | null
  ids: string[]
  lateral: Record<string, number>
}

export const SHELF_SOLIDS: ShelfSolid[] = SHELVES.map((shelf) => {
  const bounds = shelfBounds(shelf)
  return {
    id: shelf.id,
    minX: bounds.minX,
    maxX: bounds.maxX,
    minY: 0,
    maxY: shelf.kind === 'checkout' ? shelf.h : SHELF_SOLID_TOP,
    minZ: bounds.minZ,
    maxZ: bounds.maxZ,
  }
})

const EMPTY_PICK: AimPick = { primaryId: null, ids: [], lateral: {} }

function normalize(dx: number, dy: number, dz: number) {
  const len = Math.hypot(dx, dy, dz)
  if (!Number.isFinite(len) || len < 1e-5) return null
  return { dx: dx / len, dy: dy / len, dz: dz / len }
}

function pointIn(box: ShelfSolid, x: number, y: number, z: number, pad: number) {
  return (
    x >= box.minX - pad &&
    x <= box.maxX + pad &&
    y >= box.minY - pad &&
    y <= box.maxY + pad &&
    z >= box.minZ - pad &&
    z <= box.maxZ + pad
  )
}

/** Entry time of segment A→B against an AABB. 0 when A is already inside. */
export function segmentEntry(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  box: ShelfSolid,
) {
  const dx = bx - ax
  const dy = by - ay
  const dz = bz - az
  let tmin = 0
  let tmax = 1
  const axes: [number, number, number, number][] = [
    [ax, dx, box.minX, box.maxX],
    [ay, dy, box.minY, box.maxY],
    [az, dz, box.minZ, box.maxZ],
  ]
  for (const [origin, delta, min, max] of axes) {
    if (Math.abs(delta) < 1e-8) {
      if (origin < min || origin > max) return null
      continue
    }
    let t1 = (min - origin) / delta
    let t2 = (max - origin) / delta
    if (t1 > t2) {
      const swap = t1
      t1 = t2
      t2 = swap
    }
    if (t1 > tmin) tmin = t1
    if (t2 < tmax) tmax = t2
    if (tmin > tmax) return null
  }
  return tmin
}

export function productHidden(
  ox: number,
  oy: number,
  oz: number,
  px: number,
  py: number,
  pz: number,
  solids: readonly ShelfSolid[] = SHELF_SOLIDS,
) {
  const len = Math.hypot(px - ox, py - oy, pz - oz)
  if (len < 0.05) return true
  for (const box of solids) {
    const entry = segmentEntry(ox, oy, oz, px, py, pz, box)
    if (entry === null) continue
    if (pointIn(box, px, py, pz, 0.18)) {
      const inside = (1 - Math.max(0, entry)) * len
      if (inside > OWN_SHELF_HIDE) return true
      continue
    }
    if (entry < 0.9) return true
  }
  return false
}

export function cameraPlausible(px: number, py: number, pz: number, ray: AimRay) {
  const values = [ray.x, ray.y, ray.z, ray.dx, ray.dy, ray.dz]
  if (!values.every((value) => Number.isFinite(value) && Math.abs(value) < 500)) return false
  const len = Math.hypot(ray.dx, ray.dy, ray.dz)
  if (len < 0.75 || len > 1.25) return false
  const horiz = Math.hypot(ray.x - px, ray.z - pz)
  if (horiz > 7.6) return false
  if (ray.y < py - 0.6 || ray.y > py + 6.5) return false
  for (const box of SHELF_SOLIDS) {
    if (pointIn(box, ray.x, ray.y, ray.z, -0.05)) return false
  }
  return true
}

export function selectAim(
  ray: AimRay,
  playerX: number,
  playerZ: number,
  products: readonly AimProduct[],
  reach = AIM_REACH,
): AimPick {
  const dir = normalize(ray.dx, ray.dy, ray.dz)
  if (!dir) return EMPTY_PICK
  const scored: { id: string; t: number; lateral: number; x: number; y: number; z: number }[] = []
  for (const product of products) {
    if (Math.hypot(playerX - product.x, playerZ - product.z) > reach) continue
    const vx = product.x - ray.x
    const vy = product.y - ray.y
    const vz = product.z - ray.z
    const t = vx * dir.dx + vy * dir.dy + vz * dir.dz
    if (t < AIM_MIN_T || t > AIM_MAX_T) continue
    const lateral = Math.hypot(vx - dir.dx * t, vy - dir.dy * t, vz - dir.dz * t)
    if (lateral > AIM_CLUSTER_LATERAL) continue
    if (productHidden(ray.x, ray.y, ray.z, product.x, product.y, product.z)) continue
    scored.push({ id: product.id, t, lateral, x: product.x, y: product.y, z: product.z })
  }
  const facing = scored
    .filter((item) => item.lateral <= AIM_PRIMARY_LATERAL)
    .sort((a, b) => a.t - b.t || a.id.localeCompare(b.id))
  const primary = facing[0]
  if (!primary) return EMPTY_PICK
  const cluster = scored
    .filter((item) => Math.hypot(item.x - primary.x, item.y - primary.y, item.z - primary.z) <= AIM_CLUSTER_GAP)
    .sort((a, b) => a.t - b.t || a.id.localeCompare(b.id))
  const lateral: Record<string, number> = {}
  for (const item of cluster) lateral[item.id] = item.lateral
  return { primaryId: primary.id, ids: cluster.map((item) => item.id), lateral }
}
