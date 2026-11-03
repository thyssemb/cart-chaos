import type { Bounds, Obstacle } from './map'

/** Walkable staff-room interior. Walls are the bounds, not the supermarket shelves. */
export const LOBBY: Bounds = {
  minX: -7.7,
  maxX: 7.7,
  minZ: -5.5,
  maxZ: 5.5,
}

export const LOBBY_REACH = 1.45

export const LOBBY_SPOTS = {
  ready: { x: 0, z: 4.15 },
  kiosk: { x: 5.15, z: 2.2 },
  code: { x: -5.15, z: 2.2 },
  door: { x: 0, z: -4.15 },
} as const

export type LobbySpotId = keyof typeof LOBBY_SPOTS

export interface LobbySpawn {
  x: number
  z: number
  yaw: number
}

export const LOBBY_SPAWNS: LobbySpawn[] = [
  { x: -1.15, z: -0.45, yaw: 0.04 },
  { x: 1.35, z: -0.7, yaw: -0.12 },
  { x: -2.15, z: -2.15, yaw: 0.35 },
  { x: 2.25, z: -1.95, yaw: -0.4 },
  { x: 0.05, z: 1.05, yaw: Math.PI },
  { x: 0.35, z: -2.85, yaw: 0.08 },
]

export type LobbyPropKind = 'sofa' | 'table' | 'locker' | 'vend' | 'plant' | 'kiosk' | 'desk'

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
  { id: 'sofa-w', x: -3.55, z: 4.45, w: 2.5, d: 0.95, h: 0.85, y: 0.42, color: '#ff5d6c', kind: 'sofa' },
  { id: 'sofa-e', x: 3.55, z: 4.45, w: 2.5, d: 0.95, h: 0.85, y: 0.42, color: '#2ec4b6', kind: 'sofa' },
  { id: 'table', x: 0, z: 2.45, w: 1.55, d: 0.8, h: 0.42, y: 0.21, color: '#c9844a', kind: 'table' },
  { id: 'locker', x: -6.95, z: -1.15, w: 0.7, d: 2.5, h: 1.85, y: 0.92, color: '#ffd23f', kind: 'locker' },
  { id: 'vend-a', x: 6.95, z: -2.15, w: 0.72, d: 0.85, h: 1.9, y: 0.95, color: '#243044', kind: 'vend' },
  { id: 'vend-b', x: 6.95, z: -0.95, w: 0.72, d: 0.85, h: 1.9, y: 0.95, color: '#243044', kind: 'vend' },
  { id: 'plant-w', x: -6.15, z: -4.35, w: 0.55, d: 0.55, h: 1.15, y: 0.2, color: '#2f9e6a', kind: 'plant' },
  { id: 'plant-e', x: 6.15, z: -4.35, w: 0.55, d: 0.55, h: 1.15, y: 0.2, color: '#2f9e6a', kind: 'plant' },
  { id: 'kiosk', x: 6.55, z: 2.2, w: 0.7, d: 1.15, h: 1.35, y: 0.67, color: '#ff8fab', kind: 'kiosk' },
  { id: 'desk', x: -6.55, z: 2.2, w: 0.7, d: 1.15, h: 1.35, y: 0.67, color: '#7eb6ff', kind: 'desk' },
]

export const LOBBY_OBSTACLES: Obstacle[] = LOBBY_PROPS.map((prop) => ({
  id: prop.id,
  minX: prop.x - prop.w / 2,
  maxX: prop.x + prop.w / 2,
  minZ: prop.z - prop.d / 2,
  maxZ: prop.z + prop.d / 2,
}))

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
