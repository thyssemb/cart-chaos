import type { AddressInfo } from 'node:net'
import { io as clientIo, type Socket } from 'socket.io-client'
import { afterAll, describe, expect, it } from 'vitest'
import { LIST_SIZE, LOBBY, LOBBY_OBSTACLES, LOBBY_SPAWNS, PLAYER_RADIUS, SPAWNS, collides, type PublicRoom } from '@cart-chaos/shared'
import { Room } from '../src/room'
import { createGameServer } from '../src/server'

describe('salle de pause', () => {
  it('déplace, prépare, discute, lance la même manche et revient', () => {
    const room = new Room('PAUSE')
    const host = room.addPlayer('Kevin', { colorId: 'coral', faceId: 'smile', accessory: 'cap' })
    const guest = room.addPlayer('Lina', { colorId: 'blue', faceId: 'wink', accessory: 'glasses' })
    if (!host.ok || !guest.ok) throw new Error('joueurs')
    expect(host.player.x).toBeCloseTo(LOBBY_SPAWNS[0]!.x)
    expect(guest.player.x).toBeCloseTo(LOBBY_SPAWNS[1]!.x)
    expect(collides(host.player.x, host.player.z, PLAYER_RADIUS, LOBBY_OBSTACLES, LOBBY)).toBe(false)
    expect(collides(guest.player.x, guest.player.z, PLAYER_RADIUS, LOBBY_OBSTACLES, LOBBY)).toBe(false)

    const originZ = host.player.z
    const idleZ = guest.player.z
    const input = { seq: 1, forward: 1, strafe: 0, yaw: 0, sprint: false, jump: false, interactHeld: false }
    for (let step = 0; step < 8; step += 1) {
      room.setInput(host.player.id, { ...input, seq: step + 1 })
      room.tick(100)
    }
    expect(host.player.z).toBeGreaterThan(originZ + 1)
    expect(Math.abs(guest.player.z - idleZ)).toBeLessThan(0.05)
    expect(collides(host.player.x, host.player.z, PLAYER_RADIUS, LOBBY_OBSTACLES, LOBBY)).toBe(false)
    expect(room.phase).toBe('lobby')

    expect(room.start(host.player.id).ok).toBe(false)
    expect(room.setReady(host.player.id).ok).toBe(true)
    expect(host.player.ready).toBe(true)
    expect(room.setReady(host.player.id).ok).toBe(true)
    expect(host.player.ready).toBe(false)
    room.setReady(host.player.id)
    expect(room.start(host.player.id).ok).toBe(false)
    room.setReady(guest.player.id)
    expect(room.say(guest.player.id, 'salut').ok).toBe(true)
    expect(room.snapshot().chats.map((chat) => chat.text)).toContain('salut')
    expect(room.setEmote(host.player.id, 'dance').ok).toBe(true)
    expect(room.snapshot().players.find((player) => player.id === host.player.id)?.emote).toBe('dance')

    const parked = host.player.z
    expect(room.start(host.player.id).ok).toBe(true)
    expect(room.phase).toBe('countdown')
    expect(host.player.z).toBeCloseTo(parked)
    expect(guest.player.z).toBeCloseTo(idleZ)
    room.tick(3000)
    expect(room.phase).toBe('playing')
    expect(host.player.list).toHaveLength(LIST_SIZE)
    expect(guest.player.list).toHaveLength(LIST_SIZE)
    expect(Math.hypot(host.player.x - SPAWNS[0]!.x, host.player.z - SPAWNS[0]!.z)).toBeLessThan(0.05)
    expect(Math.hypot(guest.player.x - SPAWNS[1]!.x, guest.player.z - SPAWNS[1]!.z)).toBeLessThan(0.05)

    room.timeLeftMs = 30
    room.tick(50)
    expect(room.phase).toBe('results')
    expect(room.backToLobby(guest.player.id).ok).toBe(false)
    expect(room.backToLobby(host.player.id).ok).toBe(true)
    expect(room.phase).toBe('lobby')
    expect(host.player.ready).toBe(false)
    expect(collides(host.player.x, host.player.z, PLAYER_RADIUS, LOBBY_OBSTACLES, LOBBY)).toBe(false)
    expect(collides(guest.player.x, guest.player.z, PLAYER_RADIUS, LOBBY_OBSTACLES, LOBBY)).toBe(false)
    expect(room.say(guest.player.id, 'encore').ok).toBe(true)
  })
})

describe('socket salle de pause', () => {
  const game = createGameServer({ autoTick: false })
  const sockets: Socket[] = []

  afterAll(async () => {
    for (const socket of sockets) socket.close()
    await game.close()
  })

  it('montre la pose, le prêt, le chat, la manche et le retour à deux clients', async () => {
    const port = await new Promise<number>((resolve) => {
      game.httpServer.listen(0, '127.0.0.1', () => resolve((game.httpServer.address() as AddressInfo).port))
    })
    const kevin = clientIo(`http://127.0.0.1:${port}`, { transports: ['websocket'] })
    const lina = clientIo(`http://127.0.0.1:${port}`, { transports: ['websocket'] })
    sockets.push(kevin, lina)
    await new Promise((resolve) => kevin.on('connect', () => resolve(null)))
    await new Promise((resolve) => lina.on('connect', () => resolve(null)))
    const emit = <T>(socket: Socket, event: string, payload?: unknown) =>
      new Promise<T>((resolve) => socket.emit(event, payload ?? {}, (response: T) => resolve(response)))
    const waitFor = async (check: () => boolean, ms = 600) => {
      const start = Date.now()
      while (Date.now() - start < ms) {
        if (check()) return true
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
      return false
    }

    const created = await emit<{ ok: boolean; code: string; playerId: string; state: PublicRoom }>(kevin, 'create', { name: 'Kevin' })
    expect(created.ok).toBe(true)
    const states: PublicRoom[] = []
    lina.on('state', (room: PublicRoom) => states.push(room))
    const joined = await emit<{ ok: boolean; playerId: string; state: PublicRoom }>(lina, 'join', { name: 'Lina', code: created.code })
    expect(joined.ok).toBe(true)
    expect(joined.state.players).toHaveLength(2)
    for (const player of joined.state.players) {
      expect(collides(player.x, player.z, PLAYER_RADIUS, LOBBY_OBSTACLES, LOBBY)).toBe(false)
    }
    expect(joined.state.players[0]?.x).not.toBeCloseTo(joined.state.players[1]?.x ?? 0)

    const room = game.rooms.get(created.code)!
    const startZ = room.players.get(created.playerId)!.z
    for (let step = 0; step < 6; step += 1) {
      kevin.emit('input', { seq: step + 1, forward: 1, strafe: 0, yaw: 0, sprint: false, jump: false, interactHeld: false })
      await new Promise((resolve) => setTimeout(resolve, 30))
      game.tick(100)
    }
    await new Promise((resolve) => setTimeout(resolve, 40))
    const movedZ = room.players.get(created.playerId)!.z
    expect(movedZ).toBeGreaterThan(startZ + 0.35)
    expect(states.some((state) => (state.players.find((player) => player.id === created.playerId)?.z ?? 0) > startZ + 0.25)).toBe(true)
    expect(Math.abs(room.players.get(joined.playerId)!.z - (joined.state.players.find((player) => player.id === joined.playerId)?.z ?? 0))).toBeLessThan(0.2)

    expect((await emit<{ ok: boolean }>(kevin, 'start')).ok).toBe(false)
    expect((await emit<{ ok: boolean; state?: PublicRoom }>(kevin, 'ready')).ok).toBe(true)
    expect(await waitFor(() => states.some((state) => state.players.some((player) => player.id === created.playerId && player.ready)))).toBe(true)
    expect((await emit<{ ok: boolean }>(lina, 'ready')).ok).toBe(true)
    const said = await emit<{ ok: boolean }>(lina, 'chat', { text: '  <b>coucou</b>  ' })
    expect(said.ok).toBe(true)
    expect(room.chats.at(-1)?.text).toBe('coucou')
    expect(await waitFor(() => states.some((state) => state.chats.some((chat) => chat.text === 'coucou')))).toBe(true)
    expect((await emit<{ ok: boolean }>(lina, 'emote', { emote: 'wave' })).ok).toBe(true)
    expect(room.snapshot().players.find((player) => player.id === joined.playerId)?.emote).toBe('wave')

    expect((await emit<{ ok: boolean }>(kevin, 'start')).ok).toBe(true)
    expect(room.phase).toBe('countdown')
    expect(collides(room.players.get(created.playerId)!.x, room.players.get(created.playerId)!.z, PLAYER_RADIUS, LOBBY_OBSTACLES, LOBBY)).toBe(false)
    game.tick(3000)
    expect(room.phase).toBe('playing')
    expect(room.players.get(created.playerId)!.list).toHaveLength(LIST_SIZE)
    expect(room.players.get(joined.playerId)!.list).toHaveLength(LIST_SIZE)
    expect(Math.hypot(room.players.get(created.playerId)!.x - SPAWNS[0]!.x, room.players.get(created.playerId)!.z - SPAWNS[0]!.z)).toBeLessThan(0.05)

    room.timeLeftMs = 30
    game.tick(50)
    expect(room.phase).toBe('results')
    expect((await emit<{ ok: boolean }>(lina, 'back')).ok).toBe(false)
    expect((await emit<{ ok: boolean }>(kevin, 'back')).ok).toBe(true)
    expect(room.phase).toBe('lobby')
    expect(await waitFor(() => states.at(-1)?.phase === 'lobby')).toBe(true)
    for (const player of room.players.values()) {
      expect(collides(player.x, player.z, PLAYER_RADIUS, LOBBY_OBSTACLES, LOBBY)).toBe(false)
    }
  })
})