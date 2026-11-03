import type { AccessoryId, ColorId, FaceId, PublicRoom } from '@cart-chaos/shared'
import { sanitizeAccessory, sanitizeColor, sanitizeFace } from '@cart-chaos/shared'
import { create } from 'zustand'
import { clampSensitivity } from './scene/cameraRig'

export type Screen = 'menu' | 'customize' | 'howto' | 'settings' | 'lobby' | 'game'

export interface Settings {
  name: string
  colorId: ColorId
  faceId: FaceId
  accessory: AccessoryId
  master: number
  music: number
  sfx: number
  camera: number
  sensitivity: number
  invertY: boolean
}

interface State {
  screen: Screen
  room: PublicRoom | null
  playerId: string | null
  token: string | null
  connected: boolean
  error: string | null
  flash: string | null
  flashAt: number
  paused: boolean
  clockOffset: number
  playerIds: string[]
  productIds: string[]
  cartIds: string[]
  settings: Settings
  setScreen: (screen: Screen) => void
  setSettings: (patch: Partial<Settings>) => void
  setPaused: (paused: boolean) => void
  setConnected: (connected: boolean) => void
  setError: (error: string | null) => void
  setFlash: (flash: string) => void
  applyRoom: (room: PublicRoom, playerId?: string, token?: string) => void
  clearSession: () => void
}

const SETTINGS_KEY = 'cart-chaos-settings'
const SESSION_KEY = 'cart-chaos-session'

export function normalizeSettings(parsed?: Partial<Settings> | null): Settings {
  const source = parsed && typeof parsed === 'object' ? parsed : {}
  return {
    name: typeof source.name === 'string' ? source.name.slice(0, 16) : '',
    colorId: sanitizeColor(source.colorId) ?? 'coral',
    faceId: sanitizeFace(source.faceId) ?? 'smile',
    accessory: sanitizeAccessory(source.accessory) ?? 'none',
    master: clamp01(source.master, 0.85),
    music: clamp01(source.music, 0.35),
    sfx: clamp01(source.sfx, 0.8),
    camera: clamp01(source.camera, 1),
    sensitivity: readSensitivity(source.sensitivity),
    invertY: source.invertY === true,
  }
}

function readSensitivity(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 1
  return clampSensitivity(n)
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return normalizeSettings()
    return normalizeSettings(JSON.parse(raw) as Partial<Settings>)
  } catch {
    return normalizeSettings()
  }
}

function clamp01(value: unknown, fallback: number) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.min(1, n))
}

function sameIds(prev: string[], next: string[]) {
  if (prev.length === next.length && prev.every((id, index) => id === next[index])) return prev
  return next
}

export const useGame = create<State>((set, get) => ({
  screen: 'menu',
  room: null,
  playerId: null,
  token: null,
  connected: false,
  error: null,
  flash: null,
  flashAt: 0,
  paused: false,
  clockOffset: 0,
  playerIds: [],
  productIds: [],
  cartIds: [],
  settings: loadSettings(),
  setScreen: (screen) => set({ screen, error: null }),
  setSettings: (patch) => {
    const settings = { ...get().settings, ...patch }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    set({ settings })
  },
  setPaused: (paused) => set({ paused }),
  setConnected: (connected) => set({ connected }),
  setError: (error) => set({ error }),
  setFlash: (flash) => set({ flash, flashAt: Date.now() }),
  applyRoom: (room, playerId, token) => {
    const prev = get()
    let screen = prev.screen
    if (room.phase === 'lobby') {
      if (screen === 'menu' || screen === 'game') screen = 'lobby'
    } else if (screen !== 'settings') {
      screen = 'game'
    }
    const nextPlayer = playerId ?? prev.playerId
    const nextToken = token ?? prev.token
    if (nextPlayer && nextToken) {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ code: room.code, token: nextToken, playerId: nextPlayer, name: prev.settings.name }),
      )
    }
    set({
      room,
      screen,
      playerId: nextPlayer,
      token: nextToken,
      clockOffset: room.serverNow - Date.now(),
      playerIds: sameIds(prev.playerIds, room.players.map((player) => player.id)),
      productIds: sameIds(prev.productIds, room.products.map((product) => product.id)),
      cartIds: sameIds(prev.cartIds, room.carts.map((cart) => cart.id)),
      error: null,
      paused: room.phase === 'playing' ? prev.paused : false,
    })
  },
  clearSession: () => {
    sessionStorage.removeItem(SESSION_KEY)
    set({
      room: null,
      playerId: null,
      token: null,
      screen: 'menu',
      paused: false,
      playerIds: [],
      productIds: [],
      cartIds: [],
    })
  },
}))

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { code?: string; token?: string; playerId?: string }
    if (!parsed.code || !parsed.token || !parsed.playerId) return null
    return parsed
  } catch {
    return null
  }
}
