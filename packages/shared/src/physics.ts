import { CART_FOLLOW, CART_RADIUS, CART_SPEED_MUL, GRAVITY, JUMP_V, MOVE_SPEED, PLAYER_RADIUS, SLOW_MUL, SPRINT_SPEED, clamp } from './constants'
import { STORE, type Obstacle } from './map'
import type { MoveInput } from './types'

export interface Body {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  yaw: number
  grounded: boolean
}

export function cartAnchor(x: number, z: number, yaw: number) {
  return {
    x: x + Math.sin(yaw) * CART_FOLLOW,
    z: z + Math.cos(yaw) * CART_FOLLOW,
  }
}

export function discObstacle(x: number, z: number, r: number, id = 'disc'): Obstacle {
  return { id, minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r }
}

export function collides(x: number, z: number, radius: number, obstacles: Obstacle[]): boolean {
  if (x < STORE.minX + radius || x > STORE.maxX - radius || z < STORE.minZ + radius || z > STORE.maxZ - radius) {
    return true
  }
  for (const o of obstacles) {
    const px = clamp(x, o.minX, o.maxX)
    const pz = clamp(z, o.minZ, o.maxZ)
    const dx = x - px
    const dz = z - pz
    if (dx * dx + dz * dz < radius * radius) return true
  }
  return false
}

export function canOccupy(x: number, z: number, yaw: number, holding: boolean, obstacles: Obstacle[]): boolean {
  if (collides(x, z, PLAYER_RADIUS, obstacles)) return false
  if (!holding) return true
  const cart = cartAnchor(x, z, yaw)
  return !collides(cart.x, cart.z, CART_RADIUS, obstacles)
}

export function depenetrate(x: number, z: number, radius: number, obstacles: Obstacle[]) {
  let cx = x
  let cz = z
  for (let iter = 0; iter < 4; iter += 1) {
    for (const o of obstacles) {
      const px = clamp(cx, o.minX, o.maxX)
      const pz = clamp(cz, o.minZ, o.maxZ)
      const dx = cx - px
      const dz = cz - pz
      const d2 = dx * dx + dz * dz
      if (d2 >= radius * radius) continue
      if (d2 < 1e-8) {
        const left = cx - o.minX
        const right = o.maxX - cx
        const down = cz - o.minZ
        const up = o.maxZ - cz
        const m = Math.min(left, right, down, up)
        if (m === left) cx = o.minX - radius
        else if (m === right) cx = o.maxX + radius
        else if (m === down) cz = o.minZ - radius
        else cz = o.maxZ + radius
      } else {
        const d = Math.sqrt(d2)
        const k = (radius - d) / d
        cx += dx * k
        cz += dz * k
      }
    }
    cx = clamp(cx, STORE.minX + radius, STORE.maxX - radius)
    cz = clamp(cz, STORE.minZ + radius, STORE.maxZ - radius)
  }
  return { x: cx, z: cz }
}

export function stepAvatar(
  body: Body,
  input: MoveInput,
  dt: number,
  obstacles: Obstacle[],
  opts: { holding: boolean; slow: boolean; extras?: Obstacle[] },
) {
  const step = Math.max(0, Math.min(dt, 0.05))
  const blocks = opts.extras && opts.extras.length ? obstacles.concat(opts.extras) : obstacles
  const sprinting = input.sprint && input.forward > 0.2
  const speed =
    (sprinting ? SPRINT_SPEED : MOVE_SPEED) * (opts.holding ? CART_SPEED_MUL : 1) * (opts.slow ? SLOW_MUL : 1)
  body.yaw = Number.isFinite(input.yaw) ? input.yaw : body.yaw
  const f = clamp(input.forward, -1, 1)
  const strafe = clamp(input.strafe, -1, 1)
  let wx = Math.sin(body.yaw) * f + Math.cos(body.yaw) * strafe
  let wz = Math.cos(body.yaw) * f - Math.sin(body.yaw) * strafe
  const len = Math.hypot(wx, wz)
  if (len > 1) {
    wx /= len
    wz /= len
  }
  const rate = len > 0.05 ? 12 : 18
  const k = 1 - Math.exp(-rate * step)
  body.vx += (wx * speed - body.vx) * k
  body.vz += (wz * speed - body.vz) * k
  if (input.jump && body.grounded) {
    body.vy = JUMP_V
    body.grounded = false
  }
  body.vy -= GRAVITY * step

  const move = (dx: number, dz: number) => {
    if (dx === 0 && dz === 0) return
    const nx = body.x + dx
    const nz = body.z + dz
    if (!canOccupy(nx, nz, body.yaw, opts.holding, blocks)) {
      if (dx !== 0) body.vx = 0
      if (dz !== 0) body.vz = 0
      return
    }
    body.x = nx
    body.z = nz
  }
  move(body.vx * step, 0)
  move(0, body.vz * step)

  body.y += body.vy * step
  if (body.y <= 0) {
    body.y = 0
    body.vy = 0
    body.grounded = true
  } else {
    body.grounded = false
  }
}

export function slotWorld(x: number, z: number, yaw: number, local: [number, number, number]) {
  const fx = Math.sin(yaw)
  const fz = Math.cos(yaw)
  const rx = Math.cos(yaw)
  const rz = -Math.sin(yaw)
  return {
    x: x + rx * local[0] + fx * local[2],
    y: local[1],
    z: z + rz * local[0] + fz * local[2],
  }
}
