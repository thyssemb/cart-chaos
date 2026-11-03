import { describe, expect, it } from 'vitest'
import {
  CART_RADIUS,
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
  stepAvatar,
  zeroInput,
  type Body,
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
