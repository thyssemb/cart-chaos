import { OBSTACLES, stepAvatar, type Body } from '@cart-chaos/shared'
import { describe, expect, it } from 'vitest'
import {
  CEILING_Y,
  FLOOR_Y,
  LOOK_FORWARD,
  LOOK_HEIGHT,
  PITCH_MAX,
  PITCH_MIN,
  REST_DISTANCE,
  REST_HEIGHT,
  REST_SIDE,
  applyMouseLook,
  cameraFrame,
  placeCamera,
  pullCamera,
  viewElevation,
  type RigInput,
} from '../src/scene/cameraRig'
import { normalizeSettings } from '../src/store'
import { control, readInput } from '../src/views'

const open: RigInput = {
  x: 3,
  y: 0,
  z: 6,
  yaw: 0.4,
  pitch: 0,
  distance: REST_DISTANCE,
  height: REST_HEIGHT,
  side: REST_SIDE,
}

function solidShelf(x: number, y: number, z: number) {
  return OBSTACLES.some(
    (obstacle) => x >= obstacle.minX && x <= obstacle.maxX && z >= obstacle.minZ && z <= obstacle.maxZ && y >= 0 && y <= 2.4,
  )
}

describe('regard de la caméra', () => {
  it('reproduit le cadre épaule à pitch 0', () => {
    const frame = cameraFrame(open, 1)
    const yaw = open.yaw
    expect(frame.x).toBeCloseTo(open.x - Math.sin(yaw) * REST_DISTANCE + Math.cos(yaw) * REST_SIDE, 6)
    expect(frame.y).toBeCloseTo(open.y + REST_HEIGHT, 6)
    expect(frame.z).toBeCloseTo(open.z - Math.cos(yaw) * REST_DISTANCE - Math.sin(yaw) * REST_SIDE, 6)
    expect(frame.lookX).toBeCloseTo(open.x + Math.sin(yaw) * LOOK_FORWARD, 6)
    expect(frame.lookY).toBeCloseTo(open.y + LOOK_HEIGHT, 6)
    expect(frame.lookZ).toBeCloseTo(open.z + Math.cos(yaw) * LOOK_FORWARD, 6)
  })

  it('reste bien à l’intérieur de ±90° et voit le plafond comme le sol', () => {
    expect(PITCH_MAX).toBeLessThan(Math.PI / 2 - 0.25)
    expect(PITCH_MIN).toBeGreaterThan(-Math.PI / 2 + 0.25)
    const up = placeCamera({ ...open, pitch: 99 }, OBSTACLES)
    const down = placeCamera({ ...open, pitch: -99 }, OBSTACLES)
    expect(up.frame.y).toBeGreaterThanOrEqual(FLOOR_Y - 1e-3)
    expect(down.frame.y).toBeLessThanOrEqual(CEILING_Y + 1e-3)
    expect(viewElevation(up.frame)).toBeGreaterThan(0.45)
    expect(viewElevation(up.frame)).toBeLessThan(Math.PI / 2 - 0.15)
    expect(viewElevation(down.frame)).toBeLessThan(-0.45)
    expect(viewElevation(down.frame)).toBeGreaterThan(-Math.PI / 2 + 0.15)
    expect(up.frame.y).toBeLessThan(open.y + REST_HEIGHT)
    expect(down.frame.y).toBeGreaterThan(open.y + REST_HEIGHT)
  })

  it('garde le bras derrière le joueur, dans l’axe du yaw', () => {
    for (const pitch of [PITCH_MIN, 0, PITCH_MAX]) {
      const frame = cameraFrame({ ...open, pitch, side: 0 }, 1)
      const dx = frame.x - open.x
      const dz = frame.z - open.z
      const forward = dx * Math.sin(open.yaw) + dz * Math.cos(open.yaw)
      const right = dx * Math.cos(open.yaw) - dz * Math.sin(open.yaw)
      expect(frame.back).toBeGreaterThan(0.5)
      expect(forward).toBeLessThan(-0.5)
      expect(Math.abs(right)).toBeLessThan(1e-6)
    }
  })

  it('une souris vers le haut lève le regard, sauf si l’axe vertical est inversé', () => {
    const up = applyMouseLook(0.3, 0, 0, -40, 1, false)
    const down = applyMouseLook(0.3, 0, 0, 40, 1, false)
    const inverted = applyMouseLook(0.3, 0, 0, -40, 1, true)
    expect(up.yaw).toBeCloseTo(0.3)
    expect(up.pitch).toBeGreaterThan(0)
    expect(down.pitch).toBeLessThan(0)
    expect(inverted.pitch).toBeLessThan(0)
    expect(inverted.pitch).toBeCloseTo(-up.pitch)
  })

  it('applique yaw et pitch ensemble, et la sensibilité règle les deux', () => {
    const slow = applyMouseLook(1, 0.1, 30, -20, 1, false)
    const fast = applyMouseLook(1, 0.1, 30, -20, 2, false)
    expect(slow.yaw).toBeLessThan(1)
    expect(slow.pitch).toBeGreaterThan(0.1)
    expect(1 - fast.yaw).toBeCloseTo((1 - slow.yaw) * 2, 5)
    expect(fast.pitch - 0.1).toBeCloseTo((slow.pitch - 0.1) * 2, 5)
    const stuck = applyMouseLook(0, PITCH_MAX, 0, -5000, 2.5, false)
    expect(stuck.pitch).toBe(PITCH_MAX)
  })

  it('raccourcit le bras dans un rayon, un mur, le sol et le plafond', () => {
    const shelf = placeCamera({ ...open, x: -6.55, z: 3.95, yaw: 0, pitch: 0 }, OBSTACLES)
    expect(shelf.scale).toBeLessThan(0.95)
    expect(solidShelf(shelf.frame.x, shelf.frame.y, shelf.frame.z)).toBe(false)
    expect(shelf.frame.z).toBeGreaterThan(3.45)

    const wall = placeCamera({ ...open, x: 16.2, z: 0, yaw: -Math.PI / 2, pitch: 0 }, OBSTACLES)
    expect(wall.scale).toBeLessThan(0.95)
    expect(wall.frame.x).toBeLessThanOrEqual(17 - 0.25 + 1e-3)
    expect(wall.frame.x).toBeGreaterThan(15)

    const buried = pullCamera(3, 0, 6, 3, -2, 4, OBSTACLES)
    expect(buried.y).toBeGreaterThanOrEqual(FLOOR_Y - 1e-3)
    const attic = pullCamera(3, 0, 6, 3, 8, 4, OBSTACLES)
    expect(attic.y).toBeLessThanOrEqual(CEILING_Y + 1e-3)

    const free = placeCamera(open, OBSTACLES)
    expect(free.scale).toBe(1)
  })

  it('laisse le cadre de départ au-dessus des caisses', () => {
    const rest = placeCamera(
      {
        x: -3.15,
        y: 0,
        z: -6.85,
        yaw: 0.02,
        pitch: 0,
        distance: REST_DISTANCE,
        height: REST_HEIGHT,
        side: REST_SIDE,
      },
      OBSTACLES,
    )
    expect(rest.scale).toBeGreaterThan(0.92)
    expect(rest.frame.y).toBeGreaterThan(2.15)
    const ducked = placeCamera(
      {
        x: -3.15,
        y: 0,
        z: -6.85,
        yaw: 0.02,
        pitch: PITCH_MAX,
        distance: REST_DISTANCE,
        height: REST_HEIGHT,
        side: REST_SIDE,
      },
      OBSTACLES,
    )
    const insideCounter = OBSTACLES.filter((obstacle) => obstacle.id.startsWith('c')).some(
      (obstacle) =>
        ducked.frame.x >= obstacle.minX &&
        ducked.frame.x <= obstacle.maxX &&
        ducked.frame.z >= obstacle.minZ &&
        ducked.frame.z <= obstacle.maxZ &&
        ducked.frame.y <= 1.05,
    )
    expect(insideCounter).toBe(false)
    expect(ducked.frame.y).toBeGreaterThanOrEqual(FLOOR_Y - 1e-3)
  })

  it('ZQSD reste calé sur le yaw horizontal', () => {
    control.yaw = 0.8
    control.pitch = PITCH_MAX
    control.keys.clear()
    control.keys.add('z')
    try {
      const input = readInput()
      expect(input.yaw).toBe(0.8)
      expect(input.forward).toBe(1)
      expect(input.strafe).toBe(0)
      expect(input).not.toHaveProperty('pitch')
      const body: Body = { x: 1, y: 0, z: 1, vx: 0, vy: 0, vz: 0, yaw: 0, grounded: true }
      for (let step = 0; step < 10; step += 1) {
        stepAvatar(body, { ...input, seq: step }, 0.05, [], { holding: false, slow: false })
      }
      const dir = Math.atan2(body.x - 1, body.z - 1)
      const delta = Math.atan2(Math.sin(dir - 0.8), Math.cos(dir - 0.8))
      expect(Math.abs(delta)).toBeLessThan(0.12)
      expect(body.y).toBeLessThan(0.2)
    } finally {
      control.keys.clear()
      control.yaw = 0.15
      control.pitch = 0
    }
  })

  it('reprend une sauvegarde sans sensibilité ni inversion', () => {
    const legacy = normalizeSettings({ name: 'Lina', camera: 0.4, master: 0.5 })
    expect(legacy.name).toBe('Lina')
    expect(legacy.camera).toBe(0.4)
    expect(legacy.master).toBe(0.5)
    expect(legacy.sensitivity).toBe(1)
    expect(legacy.invertY).toBe(false)
    expect(normalizeSettings({ sensitivity: 9, invertY: true }).sensitivity).toBe(2.5)
    expect(normalizeSettings({ invertY: true }).invertY).toBe(true)
    expect(normalizeSettings(null).sensitivity).toBe(1)
  })
})
