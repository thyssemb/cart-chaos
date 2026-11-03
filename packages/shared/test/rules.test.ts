import { describe, expect, it } from 'vitest'
import {
  CART_RADIUS,
  CONTROLLER,
  HOMES,
  LEGENDARY_AT_MS,
  OBSTACLES,
  PLAYER_RADIUS,
  SPAWNS,
  STEAL_RANGE,
  canSteal,
  cartAnchor,
  collides,
  isListComplete,
  listBonus,
  listRows,
  pointsForItem,
  rollList,
  sanitizeCode,
  sanitizeName,
  stealBanner,
  applyKeyTurn,
  stepAvatar,
  turnToward,
  zeroInput,
  type Body,
  type Obstacle,
} from '../src/index'

describe('scores et listes', () => {
  const list = ['milk', 'bread', 'eggs', 'cheese', 'banana'] as const

  it('donne 100 à un produit de la liste, 20 en trop, 250 à un rare, 1000 au légendaire', () => {
    expect(pointsForItem('milk', [...list], {}).points).toBe(100)
    expect(pointsForItem('milk', [...list], { milk: 1 }).points).toBe(20)
    expect(pointsForItem('cereal', [...list, 'cereal'], {}).kind).toBe('rare')
    expect(pointsForItem('cereal', [...list], {}).points).toBe(250)
    expect(pointsForItem('legendary', [...list], {}).points).toBe(1000)
  })

  it('ne donne le bonus de liste complète qu’une fois', () => {
    const validated = { milk: 1, bread: 1, eggs: 1, cheese: 1, banana: 1 }
    expect(isListComplete([...list], validated)).toBe(true)
    expect(listBonus([...list], validated, false)).toBe(500)
    expect(listBonus([...list], validated, true)).toBe(0)
    expect(isListComplete([...list], { milk: 1 })).toBe(false)
  })

  it('marque la liste : validé, dans le caddie, manquant', () => {
    const rows = listRows(['milk', 'bread', 'eggs'], { milk: 1 }, ['bread'])
    expect(rows.map((row) => row.status)).toEqual(['done', 'cart', 'todo'])
  })

  it('tire 5 produits distincts', () => {
    const rolled = rollList(() => 0.4)
    expect(new Set(rolled).size).toBe(5)
    expect(rolled).not.toContain('legendary')
  })
})

describe('vol', () => {
  it('refuse mains pleines, caddie protégé, distance ou phase', () => {
    expect(canSteal({ phasePlaying: true, distance: 1, stealRange: STEAL_RANGE, productAvailable: true, thiefCarrying: false, ownerProtecting: false }).ok).toBe(true)
    expect(canSteal({ phasePlaying: false, distance: 1, stealRange: STEAL_RANGE, productAvailable: true, thiefCarrying: false, ownerProtecting: false }).reason).toBe('phase')
    expect(canSteal({ phasePlaying: true, distance: 1, stealRange: STEAL_RANGE, productAvailable: true, thiefCarrying: true, ownerProtecting: false }).reason).toBe('hands-full')
    expect(canSteal({ phasePlaying: true, distance: 1, stealRange: STEAL_RANGE, productAvailable: false, thiefCarrying: false, ownerProtecting: false }).reason).toBe('empty')
    expect(canSteal({ phasePlaying: true, distance: 1, stealRange: STEAL_RANGE, productAvailable: true, thiefCarrying: false, ownerProtecting: true }).reason).toBe('protected')
    expect(canSteal({ phasePlaying: true, distance: 9, stealRange: STEAL_RANGE, productAvailable: true, thiefCarrying: false, ownerProtecting: false }).reason).toBe('range')
  })

  it('annonce le vrai prénom et le vrai produit', () => {
    expect(stealBanner('Kevin', 'Fromage')).toBe("KEVIN T'A VOLÉ TON FROMAGE !")
  })
})

describe('carte et déplacement', () => {
  it('place les produits et les spawns hors des rayons', () => {
    for (const home of HOMES) {
      expect(collides(home.x, home.z, 0.18, OBSTACLES), home.id).toBe(false)
    }
    expect(HOMES.filter((home) => home.type === 'legendary')).toHaveLength(1)
    for (const spawn of SPAWNS) {
      expect(collides(spawn.x, spawn.z, PLAYER_RADIUS, OBSTACLES)).toBe(false)
      const cart = cartAnchor(spawn.x, spawn.z, spawn.yaw)
      expect(collides(cart.x, cart.z, CART_RADIUS, OBSTACLES)).toBe(false)
    }
  })

  it('arrête un joueur contre un rayon', () => {
    const body: Body = { x: -10.2, y: 0, z: -0.55, vx: 0, vy: 0, vz: 0, yaw: -Math.PI / 2, grounded: true }
    const input = { ...zeroInput(-Math.PI / 2), forward: 1, sprint: true }
    for (let i = 0; i < 80; i += 1) stepAvatar(body, input, 0.05, OBSTACLES, { holding: false, slow: false })
    expect(collides(body.x, body.z, PLAYER_RADIUS, OBSTACLES)).toBe(false)
    expect(body.x).toBeGreaterThan(-12.1)
    expect(body.x).toBeLessThan(-10.2)
  })

  it('accélère et tourne sans demi-tour instantané', () => {
    const body: Body = { x: -3.2, y: 0, z: -6.2, vx: 0, vy: 0, vz: 0, yaw: 0, grounded: true }
    const input = { ...zeroInput(Math.PI * 0.75), forward: 1, sprint: false }
    stepAvatar(body, input, 0.05, OBSTACLES, { holding: false, slow: false })
    expect(Math.abs(body.yaw)).toBeLessThan(1)
    expect(Math.abs(body.yaw)).toBeGreaterThan(0.2)
    expect(Math.hypot(body.vx, body.vz)).toBeLessThan(CONTROLLER.walkSpeed * 0.75)
    for (let i = 0; i < 14; i += 1) stepAvatar(body, input, 0.05, OBSTACLES, { holding: false, slow: false })
    expect(Math.hypot(body.vx, body.vz)).toBeGreaterThan(CONTROLLER.walkSpeed * 0.8)
    const reverse: Body = { x: -3.2, y: 0, z: -6.2, vx: 0, vy: 0, vz: 6, yaw: 0, grounded: true }
    stepAvatar(reverse, { ...zeroInput(0), forward: -1 }, 0.05, OBSTACLES, { holding: false, slow: false })
    expect(reverse.vz).toBeLessThan(2)
    expect(reverse.yaw).toBeCloseTo(0, 5)
    expect(CONTROLLER.sprintSpeed / CONTROLLER.walkSpeed).toBeCloseTo(1.6)
    expect(applyKeyTurn(0, 1, 0.05)).toBeCloseTo(-CONTROLLER.keyTurnSpeed * 0.05)
    expect(applyKeyTurn(0, -1, 0.05)).toBeCloseTo(CONTROLLER.keyTurnSpeed * 0.05)
    expect(turnToward(0, Math.PI, 0.4)).toBeCloseTo(0.4)
    expect(turnToward(0, -Math.PI + 0.1, 0.3)).toBeCloseTo(-0.3)
  })

  it('avance, recule, strafe et tourne du côté demandé par la caméra', () => {
    const spot = { x: -3.2, z: -6.2 }
    const wish = (aim: number, forward: number, strafe: number) => {
      let x = Math.sin(aim) * forward - Math.cos(aim) * strafe
      let z = Math.cos(aim) * forward + Math.sin(aim) * strafe
      const len = Math.hypot(x, z) || 1
      return { x: x / len, z: z / len }
    }
    const gap = (from: number, to: number) => {
      let delta = to - from
      while (delta > Math.PI) delta -= Math.PI * 2
      while (delta < -Math.PI) delta += Math.PI * 2
      return delta
    }
    for (const aim of [0, 0.85, -1.4, Math.PI * 0.92]) {
      const samples = [
        { forward: 1, strafe: 0 },
        { forward: -1, strafe: 0 },
        { forward: 0, strafe: 1 },
        { forward: 0, strafe: -1 },
        { forward: 1, strafe: 1 },
        { forward: 1, strafe: -1 },
        { forward: -1, strafe: 1 },
        { forward: -1, strafe: -1 },
      ]
      for (const sample of samples) {
        const dir = wish(aim, sample.forward, sample.strafe)
        const body: Body = { x: spot.x, y: 0, z: spot.z, vx: 0, vy: 0, vz: 0, yaw: aim, grounded: true }
        const look = wish(aim, Math.max(sample.forward, 0), sample.strafe)
        const before = gap(aim, Math.atan2(look.x, look.z))
        stepAvatar(body, { ...zeroInput(aim), ...sample }, 0.05, OBSTACLES, { holding: false, slow: false })
        const moved = body.vx * dir.x + body.vz * dir.z
        expect(moved).toBeGreaterThan(0.2)
        expect(Math.abs(body.vx * dir.z - body.vz * dir.x)).toBeLessThan(0.05)
        if (sample.forward < 0 && sample.strafe === 0) {
          expect(body.yaw).toBeCloseTo(aim, 5)
        } else if (Math.abs(before) > 0.2) {
          const after = gap(body.yaw, Math.atan2(look.x, look.z))
          expect(Math.abs(after)).toBeLessThan(Math.abs(before))
          expect(Math.sign(body.yaw - aim)).toBe(Math.sign(before))
        }
      }
    }

    const straight: Body = { x: spot.x, y: 0, z: spot.z, vx: 0, vy: 0, vz: 0, yaw: 0, grounded: true }
    for (let i = 0; i < 20; i += 1) stepAvatar(straight, { ...zeroInput(0), forward: 1 }, 0.05, OBSTACLES, { holding: false, slow: false })
    const carried = straight.vz
    stepAvatar(straight, { ...zeroInput(Math.PI / 2), forward: 1 }, 0.05, OBSTACLES, { holding: false, slow: false })
    expect(straight.vx).toBeGreaterThan(0.4)
    expect(straight.vz).toBeLessThan(carried)
    expect(straight.yaw).toBeGreaterThan(0.2)
    expect(straight.yaw).toBeLessThan(1.2)

    const open: Obstacle[] = []
    const opts = { holding: false, slow: false }
    const origin = (): Body => ({ x: -3.2, y: 0, z: 2, vx: 0, vy: 0, vz: 0, yaw: 0, grounded: true })

    const fromForward = origin()
    for (let i = 0; i < 16; i += 1) stepAvatar(fromForward, { ...zeroInput(0), forward: 1, sprint: true }, 0.05, open, opts)
    const facing = fromForward.yaw
    const coasting = fromForward.vz
    expect(coasting).toBeGreaterThan(CONTROLLER.walkSpeed)
    stepAvatar(fromForward, { ...zeroInput(0), forward: -1, sprint: true }, 0.05, open, opts)
    expect(fromForward.yaw).toBeCloseTo(facing, 4)
    expect(fromForward.vz).toBeLessThan(coasting)
    expect(fromForward.vz).toBeGreaterThan(0)
    for (let i = 0; i < 24; i += 1) stepAvatar(fromForward, { ...zeroInput(0), forward: -1, sprint: true }, 0.05, open, opts)
    expect(fromForward.yaw).toBeCloseTo(facing, 4)
    expect(fromForward.vz).toBeLessThan(-CONTROLLER.walkSpeed)

    const side = origin()
    for (let i = 0; i < 20; i += 1) stepAvatar(side, { ...zeroInput(0), strafe: -1, sprint: true }, 0.05, open, opts)
    expect(side.yaw).toBeGreaterThan(1.15)
    expect(side.vx).toBeGreaterThan(CONTROLLER.walkSpeed)
    const leftYaw = side.yaw
    const leftVx = side.vx
    stepAvatar(side, { ...zeroInput(0), strafe: 1, sprint: true }, 0.05, open, opts)
    expect(side.yaw).toBeLessThan(leftYaw)
    expect(leftYaw - side.yaw).toBeLessThan(CONTROLLER.rotationSpeed * 0.05 + 0.02)
    expect(side.vx).toBeLessThan(leftVx)
    expect(side.vx).toBeGreaterThan(0)
    for (let i = 0; i < 28; i += 1) stepAvatar(side, { ...zeroInput(0), strafe: 1, sprint: true }, 0.05, open, opts)
    expect(side.yaw).toBeLessThan(-1.15)
    expect(side.vx).toBeLessThan(-CONTROLLER.walkSpeed)
    expect(Math.hypot(side.vx, side.vz)).toBeGreaterThan(CONTROLLER.sprintSpeed * 0.75)
  })

  it('n’éjecte pas hors du magasin', () => {
    const body: Body = { x: 3.5, y: 0, z: -1, vx: 0, vy: 0, vz: 0, yaw: 0, grounded: true }
    const input = { ...zeroInput(0), forward: 1, sprint: true }
    for (let i = 0; i < 200; i += 1) stepAvatar(body, input, 0.05, OBSTACLES, { holding: false, slow: false })
    expect(body.z).toBeLessThan(13.2)
    expect(collides(body.x, body.z, PLAYER_RADIUS, OBSTACLES)).toBe(false)
  })
})

describe('entrées', () => {
  it('nettoie pseudo et code', () => {
    expect(sanitizeName('  Kévin<script>  ')).toBe('Kévin')
    expect(sanitizeName('')).toBe('Joueur')
    expect(sanitizeCode(' ab-12 ')).toBe('AB12')
  })

  it('expose le seuil du légendaire à 90 secondes', () => {
    expect(LEGENDARY_AT_MS).toBe(90_000)
  })
})
