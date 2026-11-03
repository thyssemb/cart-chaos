import type { ActionType, ClientAck, PublicRoom } from '@cart-chaos/shared'
import { io, type Socket } from 'socket.io-client'
import { ensureAudio, playSfx } from './audio'
import { loadSession, useGame } from './store'

export const socket: Socket = io({
  autoConnect: true,
  transports: ['websocket', 'polling'],
})

const seenSfx = new Set<number>()
let primed = false

socket.on('connect', () => {
  useGame.getState().setConnected(true)
  const session = loadSession()
  if (!session) return
  socket.emit('rejoin', session, (response: ClientAck) => {
    if (!response?.ok || !response.state || !response.playerId || !response.token) {
      sessionStorage.removeItem('cart-chaos-session')
      return
    }
    useGame.getState().applyRoom(response.state, response.playerId, response.token)
  })
})

socket.on('disconnect', () => {
  useGame.getState().setConnected(false)
})

socket.on('state', (room: PublicRoom) => {
  useGame.getState().applyRoom(room)
  if (!primed) {
    primed = true
    for (const effect of room.sfx) seenSfx.add(effect.id)
    return
  }
  for (const effect of room.sfx) {
    if (seenSfx.has(effect.id)) continue
    seenSfx.add(effect.id)
    playSfx(effect.type, { x: effect.x, z: effect.z })
  }
})

function ask(event: string, payload?: unknown) {
  ensureAudio()
  return new Promise<ClientAck>((resolve) => {
    if (!socket.connected) {
      resolve({ ok: false, error: 'Serveur injoignable. Lance npm run dev puis ouvre http://localhost:5173' })
      return
    }
    socket.timeout(4000).emit(event, payload ?? {}, (error: Error | null, response: ClientAck) => {
      if (error) resolve({ ok: false, error: 'Pas de réponse du serveur' })
      else resolve(response)
    })
  })
}

function lookPayload() {
  const settings = useGame.getState().settings
  return { name: settings.name, colorId: settings.colorId, faceId: settings.faceId, accessory: settings.accessory }
}

export async function createRoom() {
  const response = await ask('create', lookPayload())
  if (!response.ok || !response.state || !response.playerId || !response.token) {
    useGame.getState().setError(response.error ?? 'Création impossible')
    return
  }
  useGame.getState().applyRoom(response.state, response.playerId, response.token)
}

export async function joinRoom(code: string) {
  const response = await ask('join', { ...lookPayload(), code })
  if (!response.ok || !response.state || !response.playerId || !response.token) {
    useGame.getState().setError(response.error ?? 'Salon introuvable')
    return
  }
  useGame.getState().applyRoom(response.state, response.playerId, response.token)
}

export async function sendReady() {
  const response = await ask('ready')
  if (!response.ok) useGame.getState().setFlash(response.error ?? 'Impossible')
}

export async function sendColor(colorId: string) {
  const response = await ask('color', { colorId })
  if (!response.ok) useGame.getState().setFlash(response.error ?? 'Couleur refusée')
}

export async function sendLook() {
  const settings = useGame.getState().settings
  const response = await ask('look', { colorId: settings.colorId, faceId: settings.faceId, accessory: settings.accessory })
  if (!response.ok) useGame.getState().setFlash(response.error ?? 'Avatar refusé')
  return response.ok
}

export async function sendChat(text: string) {
  const response = await ask('chat', { text })
  if (!response.ok) useGame.getState().setFlash(response.error ?? 'Message refusé')
  return response.ok
}

export async function sendStart() {
  const response = await ask('start')
  if (!response.ok) useGame.getState().setError(response.error ?? 'Lancement refusé')
}

export async function sendRematch() {
  const response = await ask('rematch')
  if (!response.ok) useGame.getState().setError(response.error ?? 'Revanche refusée')
}

export async function sendLeave() {
  await ask('leave')
  useGame.getState().clearSession()
}

export async function sendBack() {
  const response = await ask('back')
  if (!response.ok) useGame.getState().setError(response.error ?? 'Retour refusé')
}

export async function sendEmote(emote: 'wave' | 'dance') {
  const response = await ask('emote', { emote })
  if (!response.ok && response.error && response.error !== 'Doucement' && response.error !== 'Pas maintenant') {
    useGame.getState().setFlash(response.error)
  }
}

export function sendAction(type: ActionType) {
  const state = useGame.getState()
  if (!state.room || state.room.phase !== 'playing' || state.paused) return
  socket.emit('action', { type }, (response: ClientAck) => {
    if (response && !response.ok && response.error && response.error !== 'Rien à portée' && response.error !== 'Pas encore') {
      useGame.getState().setFlash(response.error)
    }
  })
}

export function sendInput(input: {
  seq: number
  forward: number
  strafe: number
  yaw: number
  sprint: boolean
  jump: boolean
  interactHeld: boolean
}) {
  if (!socket.connected) return
  socket.emit('input', input)
}
