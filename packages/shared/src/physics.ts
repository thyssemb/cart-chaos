import { CART_FOLLOW, CART_RADIUS, CART_SPEED_MUL, CONTROLLER, GRAVITY, PLAYER_RADIUS, SLOW_MUL, clamp } from './constants'
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
  coyote?: number
  jumpLock?: number
}

function wrapAngle(delta: number) {
  let value = delta
  while (value > Math.PI) value -= Math.PI * 2
  while (value < -Math.PI) value += Math.PI * 2
  return value
}

export function turnToward(current: number, target: number, maxStep: number) {
  const delta = wrapAngle(target - current)
  return current + clamp(delta, -maxStep, maxStep)
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
  const aim = Number.isFinite(input.yaw) ? input.yaw : body.yaw
  const f = clamp(input.forward, -1, 1)
  const strafe = clamp(input.strafe, -1, 1)
  let wx = Math.sin(aim) * f + Math.cos(aim) * strafe
  let wz = Math.cos(aim) * f - Math.sin(aim) * strafe
  const len = Math.hypot(wx, wz)
  if (len > 1) {
    wx /= len
    wz /= len
  }
  const moving = len > 0.08
  const sprinting = input.sprint && f > 0.2
  const speed =
    (sprinting ? CONTROLLER.sprintSpeed : CONTROLLER.walkSpeed) *
    (opts.holding ? CART_SPEED_MUL : 1) *
    (opts.slow ? SLOW_MUL : 1) *
    len
  let face = body.yaw
  if (moving) face = opts.holding || f > 0.2 ? aim : Math.atan2(wx, wz)
  const previousYaw = body.yaw
  const maxTurn = CONTROLLER.rotationSpeed * step * (opts.holding ? 0.75 : 1)
  body.yaw = turnToward(body.yaw, face, maxTurn)
  if (opts.holding && !canOccupy(body.x, body.z, body.yaw, true, blocks)) body.yaw = previousYaw

  const accel = (moving ? CONTROLLER.acceleration : CONTROLLER.deceleration) * (body.grounded ? 1 : CONTROLLER.airControl)
  const k = 1 - Math.exp(-accel * step)
  body.vx += (wx * speed - body.vx) * k
  body.vz += (wz * speed - body.vz) * k

  body.coyote = body.grounded ? CONTROLLER.coyote : Math.max(0, (body.coyote ?? 0) - step)
  body.jumpLock = Math.max(0, (body.jumpLock ?? 0) - step)
  if (input.jump && (body.coyote ?? 0) > 0 && (body.jumpLock ?? 0) <= 0) {
    body.vy = CONTROLLER.jumpImpulse
    body.grounded = false
    body.coyote = 0
    body.jumpLock = CONTROLLER.jumpLock
  }
  body.vy -= GRAVITY * CONTROLLER.gravityScale * step

  const tryMove = (dx: number, dz: number) => {
    if (dx === 0 && dz === 0) return true
    const nx = body.x + dx
    const nz = body.z + dz
    if (!canOccupy(nx, nz, body.yaw, opts.holding, blocks)) return false
    body.x = nx
    body.z = nz
    return true
  }
  const dx = body.vx * step
  const dz = body.vz * step
  if (!tryMove(dx, dz)) {
    const xOk = tryMove(dx, 0)
    const zOk = tryMove(0, dz)
    if (!xOk) body.vx *= 0.25
    if (!zOk) body.vz *= 0.25
  }

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
