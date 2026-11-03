import { describe, expect, it } from 'vitest'
import {
  BUS_SEATS,
  HOMES,
  LOBBY,
  LOBBY_OBSTACLES,
  LOBBY_SPAWNS,
  LOBBY_SPOTS,
  PLAYER_RADIUS,
  busAlightWorld,
  busDoorWorld,
  busObstacle,
  busSeatWorld,
  cameraPlausible,
  collides,
  productHidden,
  sanitizeAction,
  selectAim,
  stepAvatar,
  type AimRay,
  type Body,
  type ShelfSolid,
} from '../src'

function rayToward(origin: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }): AimRay {
  const dx = target.x - origin.x
  const dy = target.y - origin.y
  const dz = target.z - origin.z
  const len = Math.hypot(dx, dy, dz) || 1
  return { ...origin, dx: dx / len, dy: dy / len, dz: dz / len }
}

describe('visée des produits', () => {
  const shelf: ShelfSolid = { id: 'rack', minX: -1.2, maxX: 1.2, minY: 0, maxY: 2.4, minZ: -1.1, maxZ: 1.1 }
  const front = { x: 0, y: 1.2, z: 0.68 }

  it('laisse voir la face avant et cache l’arrière ou un rayon devant', () => {
    expect(productHidden(0, 1.5, 3, front.x, front.y, front.z, [shelf])).toBe(false)
    expect(productHidden(0, 1.5, -3, front.x, front.y, front.z, [shelf])).toBe(true)
    const blocker: ShelfSolid = { id: 'other', minX: -0.6, maxX: 0.6, minY: 0, maxY: 2.4, minZ: 1.7, maxZ: 2.4 }
    expect(productHidden(0, 1.5, 4, front.x, front.y, front.z, [shelf, blocker])).toBe(true)
  })

  it('choisit le produit au centre et garde les voisins pour la molette', () => {
    const milk = HOMES.find((home) => home.id === 'milk-1')!
    const player = { x: milk.x, z: milk.z - 1.2 }
    const camera = { x: milk.x + 0.25, y: 2.05, z: milk.z - 2.5 }
    const pick = selectAim(rayToward(camera, milk), player.x, player.z, HOMES)
    expect(pick.primaryId).toBe('milk-1')
    expect(pick.ids).toContain('milk-1')
    expect(pick.ids.length).toBeGreaterThan(1)
    const back = selectAim(rayToward({ x: milk.x, y: 1.6, z: milk.z + 3.2 }, milk), milk.x, milk.z + 1.1, [milk])
    expect(back.primaryId).toBeNull()
  })

  it('refuse une caméra incohérente et un produit non visé', () => {
    const milk = HOMES.find((home) => home.id === 'milk-1')!
    const ray = rayToward({ x: milk.x, y: 1.7, z: milk.z - 2 }, milk)
    expect(cameraPlausible(milk.x, 0, milk.z - 1.2, ray)).toBe(true)
    expect(cameraPlausible(40, 0, 40, ray)).toBe(false)
    expect(sanitizeAction({ type: 'interact', targetId: 'milk-1', ray })).toMatchObject({ type: 'interact', targetId: 'milk-1' })
    expect(sanitizeAction({ type: 'interact', targetId: '../x', ray })?.targetId).toBeNull()
    expect(sanitizeAction({ type: 'nope' })).toBeNull()
  })
})

describe('place du salon', () => {
  it('laisse le centre ouvert et les départs accessibles', () => {
    expect(collides(0, -3, PLAYER_RADIUS, LOBBY_OBSTACLES, LOBBY)).toBe(false)
    expect(collides(0, 4, PLAYER_RADIUS, LOBBY_OBSTACLES, LOBBY)).toBe(false)
    for (const spawn of LOBBY_SPAWNS) {
      expect(collides(spawn.x, spawn.z, PLAYER_RADIUS, LOBBY_OBSTACLES, LOBBY)).toBe(false)
    }
    for (const spot of Object.values(LOBBY_SPOTS)) {
      expect(collides(spot.x, spot.z, PLAYER_RADIUS, LOBBY_OBSTACLES, LOBBY)).toBe(false)
    }
    const bus = busObstacle()
    const door = busDoorWorld()
    expect(door.z).toBeLessThan(bus.minZ - PLAYER_RADIUS)
    expect(door.x).toBeGreaterThan(bus.minX)
    expect(door.x).toBeLessThan(bus.maxX)
    for (let index = 0; index < BUS_SEATS.length; index += 1) {
      const seat = busSeatWorld(index)!
      expect(seat.x).toBeGreaterThan(bus.minX + 0.2)
      expect(seat.x).toBeLessThan(bus.maxX - 0.2)
      expect(seat.z).toBeGreaterThan(bus.minZ + 0.2)
      expect(seat.z).toBeLessThan(bus.maxZ - 0.2)
      const step = busAlightWorld(index)
      expect(collides(step.x, step.z, PLAYER_RADIUS, LOBBY_OBSTACLES, LOBBY)).toBe(false)
    }
    const spawn = LOBBY_SPAWNS[0]!
    const body: Body = { x: spawn.x, y: 0, z: spawn.z, vx: 0, vy: 0, vz: 0, yaw: 0, grounded: true }
    const input = { seq: 1, forward: 1, strafe: 0, yaw: 0, sprint: false, jump: false, interactHeld: false }
    for (let step = 0; step < 16; step += 1) stepAvatar(body, { ...input, seq: step + 1 }, 0.05, LOBBY_OBSTACLES, { holding: false, slow: false, bounds: LOBBY })
    expect(body.z).toBeGreaterThan(spawn.z + 1)
    expect(collides(body.x, body.z, PLAYER_RADIUS, LOBBY_OBSTACLES, LOBBY)).toBe(false)
  })
})
