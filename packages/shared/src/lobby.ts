import type { Bounds, Obstacle } from './map'

/**
 * Quartier ouvert autour d'une place. Les haies et les bâtiments ferment
 * le tour ; le rectangle ne sert que de butée derrière eux.
 */
export const LOBBY: Bounds = {
  minX: -28.6,
  maxX: 28.6,
  minZ: -18.6,
  maxZ: 22.6,
}

export const LOBBY_REACH = 1.45

export const LOBBY_MODE = {
  id: 'classic',
  label: 'Manche 3 min',
} as const

export const BUS_HOME = { x: 0.5, z: 7.55, yaw: 0 } as const
export const BUS_LENGTH = 9.2
export const BUS_WIDTH = 2.32
export const BUS_HEIGHT = 2.9
export const BUS_ROLL = 18

const DOOR_LOCAL_X = 2.2
const DOOR_LOCAL_Z = -(BUS_WIDTH / 2 + 0.62)

export const BUS_SEATS = [
  { x: -3.15, z: -0.42 },
  { x: -3.15, z: 0.42 },
  { x: -1.7, z: -0.42 },
  { x: -1.7, z: 0.42 },
  { x: -0.25, z: -0.42 },
  { x: -0.25, z: 0.42 },
] as const

export interface BusPose {
  x: number
  z: number
  yaw: number
}

export function busPoint(localX: number, localZ: number, bus: BusPose = BUS_HOME) {
  const c = Math.cos(bus.yaw)
  const s = Math.sin(bus.yaw)
  return {
    x: bus.x + c * localX - s * localZ,
    z: bus.z + s * localX + c * localZ,
  }
}

export function busDoorWorld(bus: BusPose = BUS_HOME) {
  return busPoint(DOOR_LOCAL_X, DOOR_LOCAL_Z, bus)
}

export function busAlightWorld(index: number, bus: BusPose = BUS_HOME) {
  return busPoint(DOOR_LOCAL_X + (index - 2.5) * 0.7, DOOR_LOCAL_Z - 0.15, bus)
}

export function busSeatWorld(index: number, bus: BusPose = BUS_HOME) {
  const seat = BUS_SEATS[index]
  if (!seat) return null
  const point = busPoint(seat.x, seat.z, bus)
  return { ...point, yaw: Math.PI / 2 - bus.yaw }
}

export function busObstacle(bus: BusPose = BUS_HOME): Obstacle {
  const hx = BUS_LENGTH / 2
  const hz = BUS_WIDTH / 2
  const corners = [busPoint(hx, hz, bus), busPoint(hx, -hz, bus), busPoint(-hx, hz, bus), busPoint(-hx, -hz, bus)]
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const corner of corners) {
    minX = Math.min(minX, corner.x)
    maxX = Math.max(maxX, corner.x)
    minZ = Math.min(minZ, corner.z)
    maxZ = Math.max(maxZ, corner.z)
  }
  return { id: 'bus', minX, maxX, minZ, maxZ }
}

const door = busDoorWorld()

export const LOBBY_SPOTS = {
  ready: { x: 6.15, z: 3.35 },
  kiosk: { x: -7.4, z: -1.2 },
  code: { x: 7.4, z: -2 },
  door: { x: door.x, z: door.z },
  vend: { x: -20.95, z: 2.45 },
  hoop: { x: 11, z: -9.6 },
} as const

export type LobbySpotId = keyof typeof LOBBY_SPOTS

export interface LobbySpawn {
  x: number
  z: number
  yaw: number
}

export const LOBBY_SPAWNS: LobbySpawn[] = [
  { x: -2.2, z: -3.8, yaw: 0.12 },
  { x: 2.2, z: -3.5, yaw: -0.08 },
  { x: -4.5, z: -5.2, yaw: 0.22 },
  { x: 4.3, z: -5, yaw: -0.16 },
  { x: 0.15, z: -5.5, yaw: 0.02 },
  { x: -0.7, z: -4.6, yaw: 0.06 },
]

export type LobbyFace = 'n' | 's' | 'e' | 'w'

export type LobbyPropKind =
  | 'grocery'
  | 'cafe'
  | 'house'
  | 'shop'
  | 'bakery'
  | 'stall'
  | 'bench'
  | 'vend'
  | 'hedge'
  | 'palm'
  | 'tree'
  | 'lamp'
  | 'fountain'
  | 'shelter'
  | 'table'
  | 'sign'
  | 'hoop'
  | 'stairs'
  | 'planter'

export interface LobbyProp {
  id: string
  x: number
  z: number
  w: number
  d: number
  h: number
  y: number
  color: string
  kind: LobbyPropKind
  face?: LobbyFace
}

export const LOBBY_PROPS: LobbyProp[] = [
  { id: 'grocery', x: -22.2, z: 16.2, w: 7.4, d: 4.6, h: 4.8, y: 2.4, color: '#e8c48a', kind: 'grocery', face: 's' },
  { id: 'house-blue', x: -7.6, z: 16.6, w: 6.6, d: 4.4, h: 5.5, y: 2.75, color: '#8ec5ff', kind: 'house', face: 's' },
  { id: 'cafe', x: 5.2, z: 16.3, w: 7, d: 4.2, h: 3.8, y: 1.9, color: '#ff8b78', kind: 'cafe', face: 's' },
  { id: 'shop', x: 17.2, z: 16, w: 6, d: 4.6, h: 4.3, y: 2.15, color: '#6fbf8a', kind: 'shop', face: 's' },
  { id: 'bakery', x: -22.6, z: -0.6, w: 5.4, d: 5, h: 3.5, y: 1.75, color: '#f6e2c4', kind: 'bakery', face: 'e' },
  { id: 'townhouse', x: -22.4, z: -10.6, w: 5.6, d: 5.4, h: 5.1, y: 2.55, color: '#c9a6e8', kind: 'house', face: 'e' },
  { id: 'apartments', x: 22.8, z: 2.2, w: 4.8, d: 8.4, h: 6.3, y: 3.15, color: '#e07a5f', kind: 'house', face: 'w' },
  { id: 'cottage', x: 19.6, z: -12.2, w: 6.4, d: 4.4, h: 3.4, y: 1.7, color: '#f3c1ae', kind: 'house', face: 'n' },
  { id: 'stall', x: -11.4, z: 3.6, w: 1.7, d: 2, h: 2.5, y: 1.25, color: '#ff8fab', kind: 'stall' },
  { id: 'fountain', x: 2.6, z: 1.1, w: 1.7, d: 1.7, h: 0.7, y: 0.35, color: '#9ad7ff', kind: 'fountain' },
  { id: 'shelter', x: 8, z: 5.55, w: 2.3, d: 1.15, h: 2.4, y: 1.2, color: '#fff6df', kind: 'shelter' },
  { id: 'bench-plaza', x: -5.4, z: 2.4, w: 1.6, d: 0.5, h: 0.5, y: 0.25, color: '#c9844a', kind: 'bench' },
  { id: 'bench-south', x: 5.4, z: -3.6, w: 1.6, d: 0.5, h: 0.5, y: 0.25, color: '#d39258', kind: 'bench' },
  { id: 'bench-park', x: -7.2, z: -10.2, w: 1.5, d: 0.5, h: 0.5, y: 0.25, color: '#c9844a', kind: 'bench' },
  { id: 'bench-stop', x: 7.9, z: 5.15, w: 1.5, d: 0.48, h: 0.5, y: 0.25, color: '#a86b34', kind: 'bench' },
  { id: 'bench-west', x: -16.8, z: -6.4, w: 0.5, d: 1.4, h: 0.5, y: 0.25, color: '#c9844a', kind: 'bench' },
  { id: 'vend-a', x: -21.4, z: 3.4, w: 0.68, d: 0.7, h: 1.9, y: 0.95, color: '#4d6280', kind: 'vend' },
  { id: 'vend-b', x: -20.5, z: 3.4, w: 0.68, d: 0.7, h: 1.9, y: 0.95, color: '#3e5678', kind: 'vend' },
  { id: 'table-a', x: 3.4, z: 12.6, w: 1.15, d: 1.15, h: 0.74, y: 0.37, color: '#fff3d8', kind: 'table' },
  { id: 'table-b', x: 6.8, z: 12.5, w: 1.15, d: 1.15, h: 0.74, y: 0.37, color: '#fff3d8', kind: 'table' },
  { id: 'code-frame', x: 8.85, z: -2, w: 0.28, d: 1.35, h: 1.65, y: 0.82, color: '#7eb6ff', kind: 'sign' },
  { id: 'stop-board', x: 6.15, z: 4.5, w: 0.28, d: 1.35, h: 1.7, y: 0.85, color: '#14323c', kind: 'sign' },
  { id: 'hoop', x: 12.8, z: -9.6, w: 0.42, d: 0.42, h: 3.2, y: 1.6, color: '#f4f7fb', kind: 'hoop' },
  { id: 'stairs', x: 16.8, z: -8.6, w: 1.4, d: 1.8, h: 0.95, y: 0.48, color: '#efd7b4', kind: 'stairs' },
  { id: 'planter-shop', x: -22.2, z: 13.15, w: 3.4, d: 0.6, h: 0.42, y: 0.21, color: '#6fbf73', kind: 'planter' },
  { id: 'planter-west', x: -6.6, z: 3.8, w: 1.6, d: 0.55, h: 0.42, y: 0.21, color: '#6fbf73', kind: 'planter' },
  { id: 'planter-east', x: 6, z: -0.4, w: 1.4, d: 0.55, h: 0.42, y: 0.21, color: '#8fd18a', kind: 'planter' },
  { id: 'palm-nw', x: -26.2, z: 10.5, w: 0.5, d: 0.5, h: 2.7, y: 1.35, color: '#2f9e62', kind: 'palm' },
  { id: 'palm-ne', x: 26.2, z: 11.2, w: 0.5, d: 0.5, h: 2.7, y: 1.35, color: '#2f9e62', kind: 'palm' },
  { id: 'palm-sw', x: -12.5, z: -13.5, w: 0.5, d: 0.5, h: 2.6, y: 1.3, color: '#2f9e62', kind: 'palm' },
  { id: 'palm-se', x: 9.5, z: -13.2, w: 0.5, d: 0.5, h: 2.6, y: 1.3, color: '#2f9e62', kind: 'palm' },
  { id: 'palm-n', x: -16.5, z: 12.8, w: 0.48, d: 0.48, h: 2.5, y: 1.25, color: '#2f9e62', kind: 'palm' },
  { id: 'palm-shop', x: 13.2, z: 12.2, w: 0.48, d: 0.48, h: 2.55, y: 1.28, color: '#2f9e62', kind: 'palm' },
  { id: 'tree-park', x: -8.8, z: -11.4, w: 0.7, d: 0.7, h: 3.1, y: 1.55, color: '#3e9a55', kind: 'tree' },
  { id: 'tree-court', x: 12.4, z: -7.2, w: 0.7, d: 0.7, h: 3.2, y: 1.6, color: '#2f9e62', kind: 'tree' },
  { id: 'tree-west', x: -17.2, z: 7.2, w: 0.65, d: 0.65, h: 3, y: 1.5, color: '#348a4c', kind: 'tree' },
  { id: 'tree-east', x: 23.2, z: 10.5, w: 0.65, d: 0.65, h: 2.8, y: 1.4, color: '#3e9a55', kind: 'tree' },
  { id: 'tree-north', x: -5.5, z: 12.2, w: 0.6, d: 0.6, h: 2.9, y: 1.45, color: '#2f9e62', kind: 'tree' },
  { id: 'lamp-w', x: -18.5, z: 5.45, w: 0.32, d: 0.32, h: 2.6, y: 1.3, color: '#fff1c9', kind: 'lamp' },
  { id: 'lamp-plaza', x: -8.2, z: 5.5, w: 0.32, d: 0.32, h: 2.6, y: 1.3, color: '#fff1c9', kind: 'lamp' },
  { id: 'lamp-stop', x: 9.6, z: 5.35, w: 0.32, d: 0.32, h: 2.6, y: 1.3, color: '#ffe14a', kind: 'lamp' },
  { id: 'lamp-e', x: 18.5, z: 5.5, w: 0.32, d: 0.32, h: 2.6, y: 1.3, color: '#fff1c9', kind: 'lamp' },
  { id: 'lamp-south', x: -4.8, z: -6.6, w: 0.32, d: 0.32, h: 2.5, y: 1.25, color: '#fff1c9', kind: 'lamp' },
  { id: 'lamp-park', x: 7.2, z: -9.8, w: 0.32, d: 0.32, h: 2.5, y: 1.25, color: '#fff1c9', kind: 'lamp' },
  { id: 'lamp-n1', x: -14.2, z: 12.4, w: 0.32, d: 0.32, h: 2.5, y: 1.25, color: '#fff1c9', kind: 'lamp' },
  { id: 'lamp-n2', x: 2.2, z: 12.5, w: 0.32, d: 0.32, h: 2.5, y: 1.25, color: '#fff1c9', kind: 'lamp' },
  { id: 'hedge-s', x: 0, z: -17.8, w: 54, d: 0.9, h: 1.3, y: 0.65, color: '#3e9a55', kind: 'hedge' },
  { id: 'hedge-n', x: 0, z: 21.3, w: 54, d: 0.9, h: 1.25, y: 0.62, color: '#3e9a55', kind: 'hedge' },
  { id: 'hedge-w', x: -27.6, z: 1.2, w: 0.9, d: 37, h: 1.3, y: 0.65, color: '#348a4c', kind: 'hedge' },
  { id: 'hedge-e', x: 27.6, z: 1.2, w: 0.9, d: 37, h: 1.3, y: 0.65, color: '#348a4c', kind: 'hedge' },
]

export const LOBBY_OBSTACLES: Obstacle[] = [
  busObstacle(),
  ...LOBBY_PROPS.map((prop) => ({
    id: prop.id,
    minX: prop.x - prop.w / 2,
    maxX: prop.x + prop.w / 2,
    minZ: prop.z - prop.d / 2,
    maxZ: prop.z + prop.d / 2,
  })),
]

export const LOBBY_HEIGHTS: Readonly<Record<string, number>> = {
  bus: BUS_HEIGHT,
  ...Object.fromEntries(LOBBY_PROPS.map((prop) => [prop.id, prop.h])),
}

export function lobbySpotAt(x: number, z: number, reach = LOBBY_REACH): LobbySpotId | null {
  let best: LobbySpotId | null = null
  let bestD = reach
  for (const id of Object.keys(LOBBY_SPOTS) as LobbySpotId[]) {
    const spot = LOBBY_SPOTS[id]
    const dist = Math.hypot(x - spot.x, z - spot.z)
    if (dist <= bestD) {
      best = id
      bestD = dist
    }
  }
  return best
}
