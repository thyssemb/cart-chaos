import { describe, expect, it } from 'vitest'
import { busDoorWorld, CATALOG, MATCH_MS, type AimRay, type ProductType } from '@cart-chaos/shared'
import { Room } from '../src/room'

function lookFrom(player: { x: number; y: number; z: number }, product: { x: number; y: number; z: number }): AimRay {
  const dx = product.x - player.x
  const dz = product.z - player.z
  const len = Math.hypot(dx, dz) || 1
  const x = player.x - (dx / len) * 1.7 + 0.3
  const z = player.z - (dz / len) * 1.7
  const y = player.y + 2.05
  const vx = product.x - x
  const vy = product.y - y
  const vz = product.z - z
  const mag = Math.hypot(vx, vy, vz) || 1
  return { x, y, z, dx: vx / mag, dy: vy / mag, dz: vz / mag }
}

function readyAll(room: Room) {
  const door = busDoorWorld()
  for (const player of room.players.values()) {
    if (!player.connected || player.ready) continue
    player.x = door.x
    player.z = door.z
    const boarded = room.setReady(player.id)
    if (!boarded.ok) throw new Error(boarded.error ?? 'embarquement')
  }
}

function play(room: Room) {
  const [host] = [...room.players.values()]
  readyAll(room)
  expect(room.start(host!.id).ok).toBe(true)
  room.tick(3000)
  expect(room.phase).toBe('playing')
}

function pair() {
  const room = new Room('TEST')
  const a = room.addPlayer('Kevin')
  const b = room.addPlayer('Lina')
  if (!a.ok || !b.ok) throw new Error('joueurs')
  play(room)
  return { room, a: a.player, b: b.player }
}

describe('salon', () => {
  it('partage le look et limite le chat', () => {
    const room = new Room('LOOK')
    const host = room.addPlayer('Nino', { colorId: 'blue', faceId: 'wink', accessory: 'cap' })
    const guest = room.addPlayer('Lina', { colorId: 'blue', faceId: 'cool', accessory: 'glasses' })
    if (!host.ok || !guest.ok) throw new Error('joueurs')
    expect(host.player.colorId).toBe('blue')
    expect(guest.player.colorId).not.toBe('blue')
    expect(room.setLook(host.player.id, { colorId: 'rose', faceId: 'grumpy', accessory: 'none' }).ok).toBe(true)
    const snap = room.snapshot()
    expect(snap.players.find((player) => player.id === host.player.id)).toMatchObject({ faceId: 'grumpy', accessory: 'none', colorId: 'rose' })
    expect(room.say(guest.player.id, 'salut').ok).toBe(true)
    expect(room.say(guest.player.id, 'deux').ok).toBe(true)
    expect(room.say(guest.player.id, 'trois').ok).toBe(true)
    expect(room.say(guest.player.id, 'quatre').ok).toBe(false)
    expect(room.snapshot().chats.map((chat) => chat.text)).toEqual(['salut', 'deux', 'trois'])
    readyAll(room)
    expect(room.start(host.player.id).ok).toBe(true)
    room.tick(3000)
    expect(room.say(guest.player.id, 'en jeu').ok).toBe(false)
  })
})

describe('salon plein', () => {
  it('refuse un septième joueur', () => {
    const room = new Room('FULL')
    for (let index = 0; index < 6; index += 1) {
      const joined = room.addPlayer(`Joueur${index}`)
      expect(joined.ok).toBe(true)
    }
    const extra = room.addPlayer('Extra')
    expect(extra.ok).toBe(false)
    if (!extra.ok) expect(extra.error).toBe('Salon plein')
  })
})

describe('manche', () => {
  it('lance à un seul joueur puis enchaîne compte à rebours, jeu et résultats', () => {
    const room = new Room('SOLO')
    const only = room.addPlayer('Nino')
    if (!only.ok) throw new Error('joueur')
    expect(room.start(only.player.id).ok).toBe(false)
    readyAll(room)
    expect(room.start(only.player.id).ok).toBe(true)
    room.tick(3000)
    expect(room.phase).toBe('playing')
    expect(room.timeLeftMs).toBe(MATCH_MS)
    room.timeLeftMs = 80
    room.tick(100)
    expect(room.phase).toBe('results')
  })

  it('réinitialise vraiment la revanche', () => {
    const { room, a } = pair()
    a.score = 999
    room.timeLeftMs = 30
    room.tick(50)
    expect(room.phase).toBe('results')
    expect(room.rematch(a.id).ok).toBe(true)
    expect(room.phase).toBe('countdown')
    expect(a.score).toBe(0)
    expect(room.round).toBe(2)
    room.tick(3000)
    expect(room.phase).toBe('playing')
    expect(room.timeLeftMs).toBe(MATCH_MS)
  })

  it('laisse le salon debout si quelqu’un se déconnecte', () => {
    const { room, a, b } = pair()
    room.disconnect(b.id)
    expect(room.players.has(a.id)).toBe(true)
    expect(room.phase).toBe('playing')
    expect(room.rejoin(b.token)?.id).toBe(b.id)
    expect(b.connected).toBe(true)
  })
})

describe('produits, vol, caisse', () => {
  it('ramasse, dépose, ne duplique pas, et refuse un 9e article', () => {
    const { room, a } = pair()
    const milk = [...room.products.values()].find((product) => product.type === 'milk')!
    a.x = milk.x
    a.z = milk.z - 1.25
    expect(room.handleAction(a.id, 'interact', { targetId: milk.id, ray: lookFrom(a, milk) }).ok).toBe(true)
    expect(a.carryingId).toBe(milk.id)
    expect([...room.products.values()].filter((product) => product.id === milk.id)).toHaveLength(1)
    const cart = room.carts.get(a.id)!
    cart.x = a.x
    cart.z = a.z
    expect(room.handleAction(a.id, 'interact').ok).toBe(true)
    expect(cart.itemIds).toEqual([milk.id])
    expect(milk.state).toBe('cart')
    for (let i = 0; i < 7; i += 1) {
      const next = [...room.products.values()].find((product) => product.state === 'shelf' && product.type !== 'legendary')!
      next.state = 'carried'
      next.ownerId = a.id
      a.carryingId = next.id
      expect(room.handleAction(a.id, 'interact').ok).toBe(true)
    }
    expect(cart.itemIds).toHaveLength(8)
    const extra = [...room.products.values()].find((product) => product.state === 'shelf')!
    extra.state = 'carried'
    extra.ownerId = a.id
    a.carryingId = extra.id
    expect(room.handleAction(a.id, 'interact').error).toBe('Caddie plein')
    expect(cart.itemIds).toHaveLength(8)
  })

  it('vole un produit sans le dupliquer et l’empêche si le propriétaire protège', () => {
    const { room, a, b } = pair()
    const cheese = [...room.products.values()].find((product) => product.type === 'cheese')!
    const cart = room.carts.get(a.id)!
    cheese.state = 'cart'
    cheese.ownerId = a.id
    cart.itemIds = [cheese.id]
    cart.x = 2
    cart.z = 2
    a.holdingCart = false
    cart.held = false
    a.x = 12
    a.z = 12
    b.x = cart.x + 0.4
    b.z = cart.z
    room.setInput(b.id, { seq: 1, forward: 0, strafe: 0, yaw: b.yaw, sprint: false, jump: false, interactHeld: true })
    room.tick(1100)
    expect(b.carryingId).toBe(cheese.id)
    expect(cart.itemIds).not.toContain(cheese.id)
    expect([...room.products.values()].filter((product) => product.id === cheese.id)).toHaveLength(1)
    expect(b.stolen).toBe(1)
    expect(a.lost).toBe(1)
    const banner = room.notices.find((notice) => notice.kind === 'steal')
    expect(banner?.text).toBe(`LINA T'A VOLÉ TON ${CATALOG.cheese.name.toLocaleUpperCase('fr-FR')} !`)
    expect(banner?.targetId).toBe(a.id)

    const milk = [...room.products.values()].find((product) => product.type === 'milk')!
    milk.state = 'cart'
    cart.itemIds = [milk.id]
    a.x = cart.x
    a.z = cart.z
    b.carryingId = null
    cheese.state = 'ground'
    room.setInput(b.id, { seq: 2, forward: 0, strafe: 0, yaw: b.yaw, sprint: false, jump: false, interactHeld: true })
    const before = cart.itemIds.slice()
    room.tick(1200)
    expect(cart.itemIds).toEqual(before)
    expect(b.carryingId).toBeNull()
  })

  it('encaisse une seule fois, compte la liste, le hors-liste, le rare, le bonus et le légendaire', () => {
    const { room, a } = pair()
    a.list = ['milk', 'bread', 'eggs', 'cheese', 'banana']
    const cart = room.carts.get(a.id)!
    const take = (type: ProductType) => {
      const product = [...room.products.values()].find((item) => item.type === type && item.state === 'shelf')!
      product.state = 'cart'
      cart.itemIds.push(product.id)
      return product
    }
    const milk = take('milk')
    const cereal = take('cereal')
    cart.x = -11.6
    cart.z = -10.4
    a.x = cart.x
    a.z = cart.z + 0.8
    expect(room.handleAction(a.id, 'interact').ok).toBe(true)
    expect(a.score).toBe(100 + 250)
    expect(milk.state).toBe('validated')
    expect(a.validated.milk).toBe(1)
    const again = room.handleAction(a.id, 'interact')
    expect(again.ok).toBe(false)
    expect(a.score).toBe(350)

    for (const type of ['bread', 'eggs', 'cheese', 'banana'] as const) take(type)
    room.handleAction(a.id, 'interact')
    expect(a.listBonus).toBe(true)
    expect(a.score).toBe(350 + 400 + 500)
    const scoreAfter = a.score
    room.handleAction(a.id, 'interact')
    expect(a.score).toBe(scoreAfter)

    room.timeLeftMs = 90_000
    room.tick(50)
    const legendary = room.products.get('legendary')!
    expect(legendary.state).toBe('shelf')
    room.tick(500)
    expect([...room.products.values()].filter((product) => product.type === 'legendary' && product.state !== 'validated')).toHaveLength(1)
    legendary.state = 'carried'
    a.carryingId = legendary.id
    a.yaw = Math.PI
    a.x = -11.6
    a.z = -10.15
    cart.x = -11.6
    cart.z = -11.05
    cart.yaw = a.yaw
    a.holdingCart = true
    room.handleAction(a.id, 'interact')
    expect(legendary.state).toBe('validated')
    expect(a.score).toBe(scoreAfter + 1000)
    expect(legendary.respawnIn).toBe(0)
    room.tick(10_000)
    expect(legendary.state).toBe('validated')
    expect(cereal.state).toBe('shelf')
  })

  it('bouscule avec un temps de recharge et fait tomber l’objet porté', () => {
    const { room, a, b } = pair()
    const milk = [...room.products.values()].find((product) => product.type === 'milk')!
    b.carryingId = milk.id
    milk.state = 'carried'
    milk.ownerId = b.id
    b.x = a.x + Math.sin(a.yaw) * 1.1
    b.z = a.z + Math.cos(a.yaw) * 1.1
    expect(room.handleAction(a.id, 'shove').ok).toBe(true)
    expect(milk.state).toBe('ground')
    expect(b.carryingId).toBeNull()
    expect(a.shoves).toBe(1)
    expect(room.handleAction(a.id, 'shove').error).toBe('Pas encore')
  })

  it('ramasse le produit visé et refuse un produit masqué ou hors visée', () => {
    const { room, a } = pair()
    const milk = [...room.products.values()].find((product) => product.id === 'milk-1')!
    const bread = [...room.products.values()].find((product) => product.id === 'bread-1')!
    a.x = milk.x
    a.z = milk.z - 1.25
    const ray = lookFrom(a, milk)
    expect(room.handleAction(a.id, 'interact', { targetId: bread.id, ray }).ok).toBe(false)
    expect(a.carryingId).toBeNull()
    expect(room.handleAction(a.id, 'interact', { targetId: milk.id, ray }).ok).toBe(true)
    expect(a.carryingId).toBe(milk.id)

    a.carryingId = null
    milk.state = 'shelf'
    milk.ownerId = null
    a.x = bread.x - 2.3
    a.z = bread.z
    expect(room.handleAction(a.id, 'interact', { targetId: bread.id, ray: lookFrom(a, bread) }).ok).toBe(false)
    expect(a.carryingId).toBeNull()
  })
})
