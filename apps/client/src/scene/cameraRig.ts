import { SHELVES, STORE, type Obstacle } from '@cart-chaos/shared'

interface PlanarBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

/** Shoulder the boom orbits. Pitch 0 keeps the previous over-the-shoulder frame. */
export const PIVOT_HEIGHT = 1.2
export const REST_DISTANCE = 5.35
export const REST_HEIGHT = 2.35
export const REST_SIDE = 1.05
export const LOOK_FORWARD = 1.35
export const LOOK_HEIGHT = 0.9

/** Extra pitch on top of the rest frame. The resulting view stays well inside ±90°. */
export const PITCH_MIN = -0.85
export const PITCH_MAX = 1.2

export const BASE_MOUSE_SENSITIVITY = 0.0022
export const SENSITIVITY_MIN = 0.25
export const SENSITIVITY_MAX = 2.5

export const CAMERA_RADIUS = 0.25
export const FLOOR_Y = 0.35
export const CEILING_Y = 3.9
export const SHELF_TOP = 2.4

const SOLID_TOP = new Map(SHELVES.map((shelf) => [shelf.id, shelf.kind === 'checkout' ? shelf.h : SHELF_TOP]))

export interface CameraBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

export interface RigInput {
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
  distance: number
  height: number
  side: number
}

export interface CameraFrame {
  x: number
  y: number
  z: number
  lookX: number
  lookY: number
  lookZ: number
  back: number
  up: number
  side: number
}

export function clampPitch(pitch: number) {
  if (!Number.isFinite(pitch)) return 0
  return Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch))
}

export function clampSensitivity(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.min(SENSITIVITY_MAX, Math.max(SENSITIVITY_MIN, value))
}

/** Positive pitch looks up: the camera swings down, the aim swings up. */
export function rotateBoom(back: number, up: number, pitch: number) {
  const cos = Math.cos(pitch)
  const sin = Math.sin(pitch)
  return {
    back: back * cos + up * sin,
    up: up * cos - back * sin,
  }
}

export function cameraFrame(input: RigInput, scale: number): CameraFrame {
  const pitch = clampPitch(input.pitch)
  const cam = rotateBoom(input.distance, input.height - PIVOT_HEIGHT, pitch)
  const look = rotateBoom(-LOOK_FORWARD, LOOK_HEIGHT - PIVOT_HEIGHT, pitch)
  const back = cam.back * scale
  const up = cam.up * scale
  const side = input.side * scale
  const sin = Math.sin(input.yaw)
  const cos = Math.cos(input.yaw)
  return {
    x: input.x - sin * back + cos * side,
    y: input.y + PIVOT_HEIGHT + up,
    z: input.z - cos * back - sin * side,
    lookX: input.x + sin * -look.back,
    lookY: input.y + PIVOT_HEIGHT + look.up,
    lookZ: input.z + cos * -look.back,
    back,
    up,
    side,
  }
}

export function viewElevation(frame: CameraFrame) {
  const dx = frame.lookX - frame.x
  const dy = frame.lookY - frame.y
  const dz = frame.lookZ - frame.z
  return Math.atan2(dy, Math.hypot(dx, dz))
}

export function applyMouseLook(
  yaw: number,
  pitch: number,
  movementX: number,
  movementY: number,
  sensitivity: number,
  invertY: boolean,
) {
  const sens = BASE_MOUSE_SENSITIVITY * clampSensitivity(sensitivity)
  const ySign = invertY ? 1 : -1
  return {
    yaw: yaw - movementX * sens,
    pitch: clampPitch(pitch + movementY * sens * ySign),
  }
}

export function roomBox(bounds: PlanarBounds = STORE, ceiling = CEILING_Y): CameraBox {
  return {
    minX: bounds.minX + CAMERA_RADIUS,
    maxX: bounds.maxX - CAMERA_RADIUS,
    minY: FLOOR_Y,
    maxY: ceiling,
    minZ: bounds.minZ + CAMERA_RADIUS,
    maxZ: bounds.maxZ - CAMERA_RADIUS,
  }
}

function boxTop(id: string, fallback: number, heights?: Readonly<Record<string, number>>) {
  return heights?.[id] ?? SOLID_TOP.get(id) ?? fallback
}

export function shelfBoxes(
  obstacles: Obstacle[],
  radius = CAMERA_RADIUS,
  top = SHELF_TOP,
  heights?: Readonly<Record<string, number>>,
): CameraBox[] {
  return obstacles.map((obstacle) => ({
    minX: obstacle.minX - radius,
    maxX: obstacle.maxX + radius,
    minY: -radius,
    maxY: boxTop(obstacle.id, top, heights) + radius,
    minZ: obstacle.minZ - radius,
    maxZ: obstacle.maxZ + radius,
  }))
}

function insideBox(x: number, y: number, z: number, box: CameraBox) {
  return x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY && z >= box.minZ && z <= box.maxZ
}

export function segmentHitsBox(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  box: CameraBox,
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
      if (origin < min || origin > max) return false
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
    if (tmin > tmax) return false
  }
  return true
}

function pointClear(x: number, y: number, z: number, room: CameraBox, shelves: CameraBox[]) {
  if (!insideBox(x, y, z, room)) return false
  for (const shelf of shelves) {
    if (insideBox(x, y, z, shelf)) return false
  }
  return true
}

function segmentClear(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  shelves: CameraBox[],
) {
  for (const shelf of shelves) {
    if (segmentHitsBox(ax, ay, az, bx, by, bz, shelf)) return false
  }
  return true
}

export function resolveArmScale(
  input: RigInput,
  obstacles: Obstacle[],
  bounds: PlanarBounds = STORE,
  ceiling = CEILING_Y,
  shelfTop = SHELF_TOP,
  heights?: Readonly<Record<string, number>>,
) {
  const room = roomBox(bounds, ceiling)
  const shelves = shelfBoxes(obstacles, CAMERA_RADIUS, shelfTop, heights)
  const ox = input.x
  const oy = input.y + PIVOT_HEIGHT
  const oz = input.z
  const clear = (scale: number) => {
    const frame = cameraFrame(input, scale)
    if (!pointClear(frame.x, frame.y, frame.z, room, shelves)) return false
    return segmentClear(ox, oy, oz, frame.x, frame.y, frame.z, shelves)
  }
  if (clear(1)) return 1
  let lo = 0
  let hi = 1
  if (!clear(lo)) return lo
  for (let i = 0; i < 12; i += 1) {
    const mid = (lo + hi) / 2
    if (clear(mid)) lo = mid
    else hi = mid
  }
  return lo
}

export function placeCamera(
  input: RigInput,
  obstacles: Obstacle[],
  bounds: PlanarBounds = STORE,
  ceiling = CEILING_Y,
  shelfTop = SHELF_TOP,
  heights?: Readonly<Record<string, number>>,
) {
  const scale = resolveArmScale(input, obstacles, bounds, ceiling, shelfTop, heights)
  return { scale, frame: cameraFrame(input, scale) }
}

/** Pull an already smoothed camera back along the spring so it stays in the room. */
export function pullCamera(
  x: number,
  y: number,
  z: number,
  camX: number,
  camY: number,
  camZ: number,
  obstacles: Obstacle[],
  bounds: PlanarBounds = STORE,
  ceiling = CEILING_Y,
  shelfTop = SHELF_TOP,
  heights?: Readonly<Record<string, number>>,
) {
  const room = roomBox(bounds, ceiling)
  const shelves = shelfBoxes(obstacles, CAMERA_RADIUS, shelfTop, heights)
  const ox = x
  const oy = y + PIVOT_HEIGHT
  const oz = z
  const at = (t: number) => ({
    x: ox + (camX - ox) * t,
    y: oy + (camY - oy) * t,
    z: oz + (camZ - oz) * t,
  })
  const clear = (t: number) => {
    const point = at(t)
    if (!pointClear(point.x, point.y, point.z, room, shelves)) return false
    return segmentClear(ox, oy, oz, point.x, point.y, point.z, shelves)
  }
  if (clear(1)) return { x: camX, y: camY, z: camZ }
  let lo = 0
  let hi = 1
  for (let i = 0; i < 12; i += 1) {
    const mid = (lo + hi) / 2
    if (clear(mid)) lo = mid
    else hi = mid
  }
  return at(lo)
}
