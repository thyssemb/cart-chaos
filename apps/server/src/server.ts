import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  EMPTY_ROOM_MS,
  playerName,
  sanitizeAccessory,
  sanitizeAction,
  sanitizeChat,
  sanitizeCode,
  sanitizeColor,
  sanitizeEmote,
  sanitizeFace,
  sanitizeInput,
  type AccessoryId,
  type ClientAck,
  type ColorId,
  type FaceId,
} from '@cart-chaos/shared'
import { Server } from 'socket.io'
import { Rooms, type Room } from './room'

const staticRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist')

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
}

interface Session {
  code: string
  playerId: string
}

export function createGameServer(opts?: { autoTick?: boolean }) {
  const rooms = new Rooms()
  const sessions = new Map<string, Session>()
  const hits = new Map<string, { t: number; input: number; action: number }>()

  const httpServer = http.createServer((req, res) => {
    const url = req.url ?? '/'
    if (url.startsWith('/socket.io')) return
    if (url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: true, rooms: rooms.all().length }))
      return
    }
    if (process.env.CART_STATIC === '1') {
      serveStatic(req, res)
      return
    }
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('CART CHAOS — serveur Socket.IO. Ouvre le client sur http://localhost:5173\n')
  })

  const io = new Server(httpServer, {
    cors: { origin: '*' },
    maxHttpBufferSize: 1e5,
  })

  const broadcast = (room: Room) => {
    io.to(room.code).emit('state', room.snapshot())
  }

  const bind = (socketId: string, code: string, playerId: string) => {
    for (const [otherId, session] of sessions) {
      if (session.playerId === playerId && otherId !== socketId) {
        sessions.delete(otherId)
        io.sockets.sockets.get(otherId)?.disconnect(true)
      }
    }
    sessions.set(socketId, { code, playerId })
  }

  const allow = (socketId: string, kind: 'input' | 'action', max: number) => {
    const now = Date.now()
    let bucket = hits.get(socketId)
    if (!bucket || now - bucket.t > 1000) {
      bucket = { t: now, input: 0, action: 0 }
      hits.set(socketId, bucket)
    }
    bucket[kind] += 1
    return bucket[kind] <= max
  }

  io.on('connection', (socket) => {
    const ackOf = (ack: unknown, payload: ClientAck) => {
      if (typeof ack === 'function') ack(payload)
    }

    socket.on('create', (payload: unknown, ack?: unknown) => {
      const named = playerName((payload as { name?: unknown } | null)?.name)
      if (!named.ok) return ackOf(ack, { ok: false, error: named.error })
      const created = rooms.create(named.name, readLook(payload))
      bind(socket.id, created.room.code, created.player.id)
      void socket.join(created.room.code)
      const state = created.room.snapshot()
      ackOf(ack, { ok: true, playerId: created.player.id, token: created.token, code: created.room.code, state })
      broadcast(created.room)
    })

    socket.on('join', (payload: unknown, ack?: unknown) => {
      const body = (payload ?? {}) as { name?: unknown; code?: unknown }
      const named = playerName(body.name)
      if (!named.ok) return ackOf(ack, { ok: false, error: named.error })
      const code = sanitizeCode(body.code)
      const room = rooms.get(code)
      if (!room) return ackOf(ack, { ok: false, error: 'Partie introuvable' })
      const joined = room.addPlayer(named.name, readLook(body))
      if (!joined.ok) return ackOf(ack, { ok: false, error: joined.error })
      bind(socket.id, room.code, joined.player.id)
      void socket.join(room.code)
      ackOf(ack, { ok: true, playerId: joined.player.id, token: joined.token, code: room.code, state: room.snapshot() })
      broadcast(room)
    })

    socket.on('rejoin', (payload: unknown, ack?: unknown) => {
      const body = (payload ?? {}) as { code?: unknown; token?: unknown }
      const code = sanitizeCode(body.code)
      const token = typeof body.token === 'string' ? body.token.slice(0, 64) : ''
      const room = rooms.get(code)
      if (!room) return ackOf(ack, { ok: false, error: 'Partie introuvable' })
      const player = room.rejoin(token)
      if (!player) return ackOf(ack, { ok: false, error: 'Reconnexion impossible' })
      bind(socket.id, room.code, player.id)
      void socket.join(room.code)
      ackOf(ack, { ok: true, playerId: player.id, token, code: room.code, state: room.snapshot() })
      broadcast(room)
    })

    socket.on('ready', (_payload: unknown, ack?: unknown) => {
      const result = withPlayer(socket.id, (room, playerId) => room.setReady(playerId))
      ackOf(ack, result ?? { ok: false, error: 'Pas dans un salon' })
      const session = sessions.get(socket.id)
      const room = session ? rooms.get(session.code) : null
      if (room) broadcast(room)
    })

    socket.on('look', (payload: unknown, ack?: unknown) => {
      const look = readLook(payload)
      if (!look.colorId || !look.faceId || !look.accessory) return ackOf(ack, { ok: false, error: 'Avatar incomplet' })
      const result = withPlayer(socket.id, (room, playerId) =>
        room.setLook(playerId, { colorId: look.colorId as ColorId, faceId: look.faceId as FaceId, accessory: look.accessory as AccessoryId }),
      )
      ackOf(ack, result ?? { ok: false, error: 'Pas dans un salon' })
      const session = sessions.get(socket.id)
      const room = session ? rooms.get(session.code) : null
      if (room) broadcast(room)
    })

    socket.on('chat', (payload: unknown, ack?: unknown) => {
      if (!allow(socket.id, 'action', 8)) return ackOf(ack, { ok: false, error: 'Doucement' })
      const text = sanitizeChat((payload as { text?: unknown } | null)?.text)
      if (!text) return ackOf(ack, { ok: false, error: 'Message vide' })
      const result = withPlayer(socket.id, (room, playerId) => room.say(playerId, text))
      ackOf(ack, result ?? { ok: false, error: 'Pas dans un salon' })
      const session = sessions.get(socket.id)
      const room = session ? rooms.get(session.code) : null
      if (room) broadcast(room)
    })

    socket.on('color', (payload: unknown, ack?: unknown) => {
      const color = sanitizeColor((payload as { colorId?: unknown } | null)?.colorId)
      if (!color) return ackOf(ack, { ok: false, error: 'Couleur inconnue' })
      const result = withPlayer(socket.id, (room, playerId) => room.setColor(playerId, color))
      ackOf(ack, result ?? { ok: false, error: 'Pas dans un salon' })
      const session = sessions.get(socket.id)
      const room = session ? rooms.get(session.code) : null
      if (room) broadcast(room)
    })

    socket.on('start', (_payload: unknown, ack?: unknown) => {
      const result = withPlayer(socket.id, (room, playerId) => room.start(playerId))
      ackOf(ack, result ?? { ok: false, error: 'Pas dans un salon' })
      const session = sessions.get(socket.id)
      const room = session ? rooms.get(session.code) : null
      if (room) broadcast(room)
    })

    socket.on('rematch', (_payload: unknown, ack?: unknown) => {
      const result = withPlayer(socket.id, (room, playerId) => room.rematch(playerId))
      ackOf(ack, result ?? { ok: false, error: 'Pas dans un salon' })
      const session = sessions.get(socket.id)
      const room = session ? rooms.get(session.code) : null
      if (room) broadcast(room)
    })

    socket.on('back', (_payload: unknown, ack?: unknown) => {
      const result = withPlayer(socket.id, (room, playerId) => room.backToLobby(playerId))
      ackOf(ack, result ?? { ok: false, error: 'Pas dans un salon' })
      const session = sessions.get(socket.id)
      const room = session ? rooms.get(session.code) : null
      if (room) broadcast(room)
    })

    socket.on('emote', (payload: unknown, ack?: unknown) => {
      if (!allow(socket.id, 'action', 8)) return ackOf(ack, { ok: false, error: 'Doucement' })
      const emote = sanitizeEmote(payload)
      if (!emote) return ackOf(ack, { ok: false, error: 'Emote inconnue' })
      const result = withPlayer(socket.id, (room, playerId) => room.setEmote(playerId, emote))
      ackOf(ack, result ?? { ok: false, error: 'Pas dans un salon' })
      const session = sessions.get(socket.id)
      const room = session ? rooms.get(session.code) : null
      if (room) broadcast(room)
    })

    socket.on('leave', (_payload: unknown, ack?: unknown) => {
      const session = sessions.get(socket.id)
      if (!session) return ackOf(ack, { ok: true })
      const room = rooms.get(session.code)
      sessions.delete(socket.id)
      void socket.leave(session.code)
      if (room) {
        room.remove(session.playerId)
        broadcast(room)
        if (room.players.size === 0) rooms.delete(room.code)
      }
      ackOf(ack, { ok: true })
    })

    socket.on('input', (payload: unknown) => {
      if (!allow(socket.id, 'input', 40)) return
      const input = sanitizeInput(payload)
      if (!input) return
      const session = sessions.get(socket.id)
      if (!session) return
      rooms.get(session.code)?.setInput(session.playerId, input)
    })

    socket.on('action', (payload: unknown, ack?: unknown) => {
      if (!allow(socket.id, 'action', 16)) return ackOf(ack, { ok: false, error: 'Doucement' })
      const action = sanitizeAction(payload)
      if (!action) return ackOf(ack, { ok: false, error: 'Action inconnue' })
      const result = withPlayer(socket.id, (room, playerId) => room.handleAction(playerId, action))
      ackOf(ack, result ?? { ok: false, error: 'Pas dans un salon' })
    })

    socket.on('disconnect', () => {
      hits.delete(socket.id)
      const session = sessions.get(socket.id)
      if (!session) return
      sessions.delete(socket.id)
      const room = rooms.get(session.code)
      if (!room) return
      const still = [...sessions.values()].some((item) => item.playerId === session.playerId)
      if (still) return
      room.disconnect(session.playerId)
      broadcast(room)
    })
  })

  const tick = (ms = 50) => {
    for (const room of rooms.all()) {
      room.tick(ms)
      if (room.players.size === 0 || room.emptyFor > EMPTY_ROOM_MS) {
        rooms.delete(room.code)
        continue
      }
      broadcast(room)
    }
  }

  const timer = opts?.autoTick === false ? null : setInterval(() => tick(50), 50)

  const close = async () => {
    if (timer) clearInterval(timer)
    await new Promise<void>((resolve) => io.close(() => resolve()))
    await new Promise<void>((resolve) => httpServer.close(() => resolve()))
  }

  function withPlayer(socketId: string, fn: (room: Room, playerId: string) => { ok: boolean; error?: string }) {
    const session = sessions.get(socketId)
    if (!session) return null
    const room = rooms.get(session.code)
    if (!room) return null
    return fn(room, session.playerId)
  }

  return { httpServer, io, rooms, tick, close }
}

function readLook(payload: unknown) {
  const body = (payload ?? {}) as { colorId?: unknown; faceId?: unknown; accessory?: unknown }
  return {
    colorId: sanitizeColor(body.colorId),
    faceId: sanitizeFace(body.faceId) ?? ('smile' as const),
    accessory: sanitizeAccessory(body.accessory) ?? ('none' as const),
  }
}

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  let pathname = decodeURIComponent(url.pathname)
  if (pathname.endsWith('/')) pathname += 'index.html'
  const file = path.normalize(path.join(staticRoot, pathname))
  if (!file.startsWith(staticRoot)) {
    res.writeHead(403)
    res.end('Interdit')
    return
  }
  fs.readFile(file, (error, data) => {
    if (error) {
      const index = path.join(staticRoot, 'index.html')
      fs.readFile(index, (indexError, html) => {
        if (indexError) {
          res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
          res.end('Client non construit. Lance npm run dev ou npm run build.')
          return
        }
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        res.end(html)
      })
      return
    }
    const type = MIME[path.extname(file)] ?? 'application/octet-stream'
    res.writeHead(200, { 'content-type': type })
    res.end(data)
  })
}
