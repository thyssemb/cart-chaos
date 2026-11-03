import type { Bounds, Obstacle } from './map'

/**
 * Open plaza. The rectangle is only a backstop behind the hedges: the walkable
 * middle stays clear, and the scenery is what stops you.
 */
export const LOBBY: Bounds = {
  minX: -14.9,
  maxX: 14.9,
  minZ: -10.7,
  maxZ: 12.3,
}

export const LOBBY_REACH = 1.45

export const LOBBY_MODE = {
  id: 'classic',
  label: 'Manche 3 min',
} as const

export const LOBBY_SPOTS = {
  ready: { x: -7, z: 5.05 },
  kiosk: { x: -8.9, z: -1.7 },
  code: { x: 7.7, z: -2.6 },
  door: { x: 0, z: -1.15 },
  vend: { x: -12.7, z: 3.9 },
  hoop: { x: 9.7, z: -5.5 },
} as const

export type LobbySpotId = keyof typeof LOBBY_SPOTS

export interface LobbySpawn {
  x: number
  z: number
  yaw: number
}

export const LOBBY_SPAWNS: LobbySpawn[] = [
  { x: -2.2, z: -2.6, yaw: 0.2 },
  { x: 1.6, z: -2.4, yaw: -0.15 },
  { x: -3.3, z: -4.2, yaw: 0.35 },
  { x: 2.7, z: -1.4, yaw: -0.25 },
  { x: 0.2, z: -3.6, yaw: 0.05 },
  { x: 0.9, z: -3.15, yaw: 0.1 },
]

export type LobbyPropKind =
  | 'grocery'
  | 'cafe'
  | 'stall'
  | 'podium'
  | 'bench'
  | 'vend'
  | 'hedge'
  | 'palm'
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
}

export const LOBBY_PROPS: LobbyProp[] = [
  { id: 'grocery', x: -7, z: 8.5, w: 7.2, d: 4.2, h: 4.6, y: 2.3, color: '#e8c48a', kind: 'grocery' },
  { id: 'cafe', x: 6.8, z: 8.45, w: 6, d: 3.9, h: 3.8, y: 1.9, color: '#ff8b78', kind: 'cafe' },
  { id: 'stall', x: -11.15, z: -1.7, w: 1.55, d: 2.05, h: 2.55, y: 1.28, color: '#ff8fab', kind: 'stall' },
  { id: 'podium', x: 0, z: 0.85, w: 1.4, d: 1.4, h: 1.05, y: 0.52, color: '#ffd56a', kind: 'podium' },
  { id: 'bench-s', x: 3.4, z: -3.7, w: 1.7, d: 0.55, h: 0.5, y: 0.25, color: '#c9844a', kind: 'bench' },
  { id: 'bench-w', x: -4.5, z: 2.5, w: 0.55, d: 1.55, h: 0.5, y: 0.25, color: '#c9844a', kind: 'bench' },
  { id: 'bench-e', x: 4.5, z: 2.15, w: 1.55, d: 0.5, h: 0.5, y: 0.25, color: '#c9844a', kind: 'bench' },
  { id: 'bench-nook', x: 11.55, z: 4.15, w: 0.5, d: 1.35, h: 0.5, y: 0.25, color: '#d39258', kind: 'bench' },
  { id: 'vend-a', x: -11.45, z: 3.35, w: 0.68, d: 0.7, h: 1.9, y: 0.95, color: '#4d6280', kind: 'vend' },
  { id: 'vend-b', x: -11.45, z: 4.3, w: 0.68, d: 0.7, h: 1.9, y: 0.95, color: '#3e5678', kind: 'vend' },
  { id: 'table-a', x: 5.25, z: 4.55, w: 1.15, d: 1.15, h: 0.74, y: 0.37, color: '#fff3d8', kind: 'table' },
  { id: 'table-b', x: 8.65, z: 4.4, w: 1.15, d: 1.15, h: 0.74, y: 0.37, color: '#fff3d8', kind: 'table' },
  { id: 'sign', x: 9.2, z: -2.6, w: 0.28, d: 1.35, h: 1.65, y: 0.82, color: '#7eb6ff', kind: 'sign' },
  { id: 'hoop', x: 11.2, z: -5.5, w: 0.42, d: 0.42, h: 3.2, y: 1.6, color: '#f4f7fb', kind: 'hoop' },
  { id: 'stairs', x: 11.7, z: 8.15, w: 1.3, d: 1.7, h: 0.95, y: 0.48, color: '#efd7b4', kind: 'stairs' },
  { id: 'planter-a', x: -9.7, z: 5.75, w: 2.2, d: 0.65, h: 0.42, y: 0.21, color: '#6fbf73', kind: 'planter' },
  { id: 'planter-b', x: -4.15, z: 5.75, w: 2.15, d: 0.65, h: 0.42, y: 0.21, color: '#6fbf73', kind: 'planter' },
  { id: 'palm-a', x: -8.4, z: -7.6, w: 0.5, d: 0.5, h: 2.7, y: 1.35, color: '#2f9e62', kind: 'palm' },
  { id: 'palm-b', x: 8.2, z: -7.5, w: 0.5, d: 0.5, h: 2.7, y: 1.35, color: '#2f9e62', kind: 'palm' },
  { id: 'palm-c', x: 12.35, z: 1.2, w: 0.48, d: 0.48, h: 2.6, y: 1.3, color: '#2f9e62', kind: 'palm' },
  { id: 'palm-d', x: -12.55, z: 6.7, w: 0.48, d: 0.48, h: 2.5, y: 1.25, color: '#2f9e62', kind: 'palm' },
  { id: 'palm-e', x: 2.4, z: 5.9, w: 0.48, d: 0.48, h: 2.55, y: 1.28, color: '#2f9e62', kind: 'palm' },
  { id: 'palm-f', x: -6.2, z: -7.9, w: 0.48, d: 0.48, h: 2.45, y: 1.22, color: '#2f9e62', kind: 'palm' },
  { id: 'hedge-s', x: 0, z: -9.95, w: 28.8, d: 0.8, h: 1.15, y: 0.58, color: '#3e9a55', kind: 'hedge' },
  { id: 'hedge-n', x: 0, z: 11.5, w: 28.8, d: 0.8, h: 1.2, y: 0.6, color: '#3e9a55', kind: 'hedge' },
  { id: 'hedge-w', x: -14.05, z: 0.7, w: 0.75, d: 20.8, h: 1.2, y: 0.6, color: '#348a4c', kind: 'hedge' },
  { id: 'hedge-e', x: 14.05, z: 0.7, w: 0.75, d: 20.8, h: 1.2, y: 0.6, color: '#348a4c', kind: 'hedge' },
]

export const LOBBY_OBSTACLES: Obstacle[] = LOBBY_PROPS.map((prop) => ({
  id: prop.id,
  minX: prop.x - prop.w / 2,
  maxX: prop.x + prop.w / 2,
  minZ: prop.z - prop.d / 2,
  maxZ: prop.z + prop.d / 2,
}))

export const LOBBY_HEIGHTS: Readonly<Record<string, number>> = Object.fromEntries(LOBBY_PROPS.map((prop) => [prop.id, prop.h]))

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
