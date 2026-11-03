import type { AddressInfo } from 'node:net'
import { io as clientIo, type Socket } from 'socket.io-client'
import { afterAll, describe, expect, it } from 'vitest'
import { busDoorWorld, type PublicRoom } from '@cart-chaos/shared'
import { createGameServer } from '../src/server'

const game = createGameServer({ autoTick: false })

function listen() {
  return new Promise<number>((resolve) => {
    game.httpServer.listen(0, '127.0.0.1', () => {
      resolve((game.httpServer.address() as AddressInfo).port)
    })
  })
}

function connect(port: number) {
  return clientIo(`http://127.0.0.1:${port}`, { transports: ['websocket'] })
}

function emit<T>(socket: Socket, event: string, payload?: unknown) {
  return new Promise<T>((resolve) => {
    socket.emit(event, payload ?? {}, (response: T) => resolve(response))
  })
}

describe('socket multijoueur', () => {
  let port = 0
  const sockets: Socket[] = []

  afterAll(async () => {
    for (const socket of sockets) socket.close()
    await game.close()
  })

  it('crée, rejoint, lance, déplace, encaisse, déconnecte et relance', async () => {
    port = await listen()
    const kevin = connect(port)
    const lina = connect(port)
    sockets.push(kevin, lina)
    await new Promise((resolve) => kevin.on('connect', () => resolve(null)))
    await new Promise((resolve) => lina.on('connect', () => resolve(null)))

    const created = await emit<{ ok: boolean; code: string; token: string; playerId: string; state: PublicRoom }>(kevin, 'create', {
      name: 'Kevin',
    })
    expect(created.ok).toBe(true)
    expect(created.code).toHaveLength(4)

    const joined = await emit<{ ok: boolean; playerId: string; state: PublicRoom }>(lina, 'join', {
      name: 'Lina',
      code: created.code,
    })
    expect(joined.ok).toBe(true)
    expect(joined.state.players).toHaveLength(2)

    const stranger = connect(port)
    sockets.push(stranger)
    await new Promise((resolve) => stranger.on('connect', () => resolve(null)))
    const full = await emit<{ ok: boolean; error?: string }>(stranger, 'join', { name: 'Nino', code: 'ZZZZ' })
    expect(full.ok).toBe(false)
    expect(full.error).toBe('Partie introuvable')
    const shortCode = await emit<{ ok: boolean; error?: string }>(stranger, 'join', { name: 'Nino', code: 'AB' })
    expect(shortCode.ok).toBe(false)
    expect(shortCode.error).toBe('Entre le code de la partie')

    const tooSoon = await emit<{ ok: boolean }>(kevin, 'start')
    expect(tooSoon.ok).toBe(false)
    const door = busDoorWorld()
    const room = game.rooms.get(created.code)!
    room.players.get(created.playerId)!.x = door.x
    room.players.get(created.playerId)!.z = door.z
    room.players.get(joined.playerId)!.x = door.x
    room.players.get(joined.playerId)!.z = door.z
    expect((await emit<{ ok: boolean }>(kevin, 'ready')).ok).toBe(true)
    expect((await emit<{ ok: boolean }>(lina, 'ready')).ok).toBe(true)
    const said = await emit<{ ok: boolean; state?: PublicRoom }>(lina, 'chat', { text: '  <b>prête</b>  ' })
    expect(said.ok).toBe(true)
    const started = await emit<{ ok: boolean }>(kevin, 'start')
    expect(started.ok).toBe(true)
    game.tick(3000)
    expect(room.phase).toBe('playing')

    const before = room.players.get(created.playerId)!.z
    room.setInput(created.playerId, {
      seq: 1,
      forward: 1,
      strafe: 0,
      yaw: 0,
      sprint: true,
      jump: false,
      interactHeld: false,
    })
    game.tick(600)
    expect(room.players.get(created.playerId)!.z).toBeGreaterThan(before + 0.4)

    const milk = [...room.products.values()].find((product) => product.type === 'milk')!
    const kevinPlayer = room.players.get(created.playerId)!
    kevinPlayer.x = milk.x
    kevinPlayer.z = milk.z - 1.25
    const dx = milk.x - kevinPlayer.x
    const dz = milk.z - kevinPlayer.z
    const flat = Math.hypot(dx, dz) || 1
    const origin = { x: kevinPlayer.x - (dx / flat) * 1.7, y: 2.05, z: kevinPlayer.z - (dz / flat) * 1.7 }
    const vx = milk.x - origin.x
    const vy = milk.y - origin.y
    const vz = milk.z - origin.z
    const mag = Math.hypot(vx, vy, vz) || 1
    const picked = await emit<{ ok: boolean }>(kevin, 'action', {
      type: 'interact',
      targetId: milk.id,
      ray: { ...origin, dx: vx / mag, dy: vy / mag, dz: vz / mag },
    })
    expect(picked.ok).toBe(true)
    expect(kevinPlayer.carryingId).toBe(milk.id)

    const cart = room.carts.get(created.playerId)!
    cart.x = kevinPlayer.x
    cart.z = kevinPlayer.z
    const dropped = await emit<{ ok: boolean }>(kevin, 'action', { type: 'interact' })
    expect(dropped.ok).toBe(true)
    expect(cart.itemIds).toContain(milk.id)

    const linaPlayer = room.players.get(joined.playerId)!
    kevinPlayer.holdingCart = false
    cart.held = false
    kevinPlayer.x = 14
    kevinPlayer.z = -4
    linaPlayer.x = cart.x
    linaPlayer.z = cart.z + 0.3
    room.setInput(joined.playerId, {
      seq: 2,
      forward: 0,
      strafe: 0,
      yaw: linaPlayer.yaw,
      sprint: false,
      jump: false,
      interactHeld: true,
    })
    game.tick(1100)
    expect(linaPlayer.carryingId).toBe(milk.id)
    expect(cart.itemIds).not.toContain(milk.id)

    linaPlayer.carryingId = null
    milk.state = 'cart'
    milk.ownerId = created.playerId
    cart.itemIds = [milk.id]
    cart.x = -11.6
    cart.z = -10.3
    kevinPlayer.x = cart.x
    kevinPlayer.z = cart.z + 0.6
    kevinPlayer.holdingCart = true
    const paid = await emit<{ ok: boolean }>(kevin, 'action', { type: 'interact' })
    expect(paid.ok).toBe(true)
    expect(kevinPlayer.score).toBeGreaterThan(0)
    expect(milk.state).toBe('validated')
    const paidAgain = await emit<{ ok: boolean }>(kevin, 'action', { type: 'interact' })
    expect(paidAgain.ok).toBe(false)

    room.timeLeftMs = 40
    game.tick(50)
    expect(room.phase).toBe('results')
    const again = await emit<{ ok: boolean }>(kevin, 'rematch')
    expect(again.ok).toBe(true)
    expect(room.phase).toBe('countdown')
    expect(kevinPlayer.score).toBe(0)

    lina.close()
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(room.players.get(joined.playerId)?.connected).toBe(false)
    expect(room.phase).toBe('countdown')
    const back = connect(port)
    sockets.push(back)
    await new Promise((resolve) => back.on('connect', () => resolve(null)))
    const rejoined = await emit<{ ok: boolean }>(back, 'rejoin', { code: created.code, token: room.players.get(joined.playerId)?.token })
    expect(rejoined.ok).toBe(true)
    expect(room.players.get(joined.playerId)?.connected).toBe(true)
  })
})
