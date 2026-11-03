import type { AimRay } from './aim'
import {
  ACCESSORIES,
  CATALOG,
  FACES,
  LIST_POOL,
  LIST_SIZE,
  POINTS,
  type AccessoryId,
  type FaceId,
  type ProductType,
} from './constants'

export interface ScoreResult {
  points: number
  kind: 'legendary' | 'rare' | 'listed' | 'extra'
  fulfills: boolean
}

export function pointsForItem(
  type: ProductType,
  list: ProductType[],
  validated: Partial<Record<ProductType, number>>,
): ScoreResult {
  const def = CATALOG[type]
  if (def.rarity === 'legendary') return { points: POINTS.legendary, kind: 'legendary', fulfills: false }
  const needed = list.filter((t) => t === type).length
  const have = validated[type] ?? 0
  const fulfills = have < needed
  if (def.rarity === 'rare') return { points: POINTS.rare, kind: 'rare', fulfills }
  if (fulfills) return { points: POINTS.listed, kind: 'listed', fulfills: true }
  return { points: POINTS.extra, kind: 'extra', fulfills: false }
}

export function isListComplete(list: ProductType[], validated: Partial<Record<ProductType, number>>) {
  if (list.length === 0) return false
  const need: Partial<Record<ProductType, number>> = {}
  for (const type of list) need[type] = (need[type] ?? 0) + 1
  for (const type of Object.keys(need) as ProductType[]) {
    if ((validated[type] ?? 0) < (need[type] ?? 0)) return false
  }
  return true
}

export function listBonus(list: ProductType[], validated: Partial<Record<ProductType, number>>, already: boolean) {
  if (already) return 0
  return isListComplete(list, validated) ? POINTS.complete : 0
}

export interface StealContext {
  phasePlaying: boolean
  distance: number
  stealRange: number
  productAvailable: boolean
  thiefCarrying: boolean
  ownerProtecting: boolean
}

export function canSteal(ctx: StealContext): { ok: boolean; reason?: string } {
  if (!ctx.phasePlaying) return { ok: false, reason: 'phase' }
  if (ctx.thiefCarrying) return { ok: false, reason: 'hands-full' }
  if (!ctx.productAvailable) return { ok: false, reason: 'empty' }
  if (ctx.ownerProtecting) return { ok: false, reason: 'protected' }
  if (ctx.distance > ctx.stealRange) return { ok: false, reason: 'range' }
  return { ok: true }
}

export function rollList(rng: () => number): ProductType[] {
  const pool = [...LIST_POOL]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const swap = pool[i]!
    pool[i] = pool[j]!
    pool[j] = swap
  }
  return pool.slice(0, LIST_SIZE)
}

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type RowStatus = 'done' | 'cart' | 'todo'

export function listRows(
  list: ProductType[],
  validated: Partial<Record<ProductType, number>>,
  pocket: ProductType[],
): { type: ProductType; name: string; status: RowStatus }[] {
  const have: Partial<Record<ProductType, number>> = { ...validated }
  const bag: Partial<Record<ProductType, number>> = {}
  for (const type of pocket) bag[type] = (bag[type] ?? 0) + 1
  return list.map((type) => {
    if ((have[type] ?? 0) > 0) {
      have[type] = (have[type] ?? 0) - 1
      return { type, name: CATALOG[type].name, status: 'done' as const }
    }
    if ((bag[type] ?? 0) > 0) {
      bag[type] = (bag[type] ?? 0) - 1
      return { type, name: CATALOG[type].name, status: 'cart' as const }
    }
    return { type, name: CATALOG[type].name, status: 'todo' as const }
  })
}

export function stealBanner(thief: string, product: string) {
  return `${thief.toLocaleUpperCase('fr-FR')} T'A VOLÉ TON ${product.toLocaleUpperCase('fr-FR')} !`
}

export function zeroInput(yaw = 0): import('./types').MoveInput {
  return { seq: 0, forward: 0, strafe: 0, yaw, sprint: false, jump: false, interactHeld: false }
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function makeRoomCode(rng: () => number = Math.random) {
  let code = ''
  for (let i = 0; i < 4; i += 1) code += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)]
  return code
}

export function cleanName(raw: unknown) {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N} _'-]/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 16)
}

export function sanitizeName(raw: unknown) {
  const clean = cleanName(raw)
  return clean.length ? clean : 'Joueur'
}

export function playerName(raw: unknown): { ok: true; name: string } | { ok: false; error: string } {
  const name = cleanName(raw)
  if (name.length < 3) return { ok: false, error: 'Le pseudo doit faire 3 à 16 caractères' }
  return { ok: true, name }
}

export function sanitizeFace(raw: unknown): FaceId | null {
  if (typeof raw !== 'string') return null
  return FACES.some((face) => face.id === raw) ? (raw as FaceId) : null
}

export function sanitizeAccessory(raw: unknown): AccessoryId | null {
  if (typeof raw !== 'string') return null
  return ACCESSORIES.some((item) => item.id === raw) ? (raw as AccessoryId) : null
}

export function sanitizeChat(raw: unknown) {
  if (typeof raw !== 'string') return null
  const text = raw
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001f]/g, '')
    .trim()
    .slice(0, 80)
  return text.length ? text : null
}

export function sanitizeCode(raw: unknown) {
  if (typeof raw !== 'string') return ''
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
}

export function sanitizeInput(raw: unknown): import('./types').MoveInput | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const forward = Number(o.forward)
  const strafe = Number(o.strafe)
  const yaw = Number(o.yaw)
  const seq = Number(o.seq)
  if (![forward, strafe, yaw, seq].every(Number.isFinite)) return null
  return {
    seq,
    forward: clampNum(forward),
    strafe: clampNum(strafe),
    yaw,
    sprint: Boolean(o.sprint),
    jump: Boolean(o.jump),
    interactHeld: Boolean(o.interactHeld),
  }
}

function clampNum(n: number) {
  return Math.max(-1, Math.min(1, n))
}

export interface ActionRequest {
  type: import('./types').ActionType
  targetId: string | null
  ray: AimRay | null
}

function sanitizeTarget(raw: unknown) {
  if (typeof raw !== 'string') return null
  return /^[a-z0-9-]{1,24}$/.test(raw) ? raw : null
}

function sanitizeRay(raw: unknown): AimRay | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const x = Number(o.x)
  const y = Number(o.y)
  const z = Number(o.z)
  const dx = Number(o.dx)
  const dy = Number(o.dy)
  const dz = Number(o.dz)
  const values = [x, y, z, dx, dy, dz]
  if (!values.every((value) => Number.isFinite(value) && Math.abs(value) < 500)) return null
  const len = Math.hypot(dx, dy, dz)
  if (len < 0.5 || len > 1.5) return null
  return { x, y, z, dx: dx / len, dy: dy / len, dz: dz / len }
}

export function sanitizeAction(raw: unknown): ActionRequest | null {
  if (!raw || typeof raw !== 'object') return null
  const t = (raw as { type?: unknown }).type
  if (t !== 'interact' && t !== 'grab' && t !== 'shove') return null
  const body = raw as { targetId?: unknown; ray?: unknown }
  return { type: t, targetId: sanitizeTarget(body.targetId), ray: sanitizeRay(body.ray) }
}

export function sanitizeEmote(raw: unknown): import('./types').EmoteId | null {
  const value = raw && typeof raw === 'object' ? (raw as { emote?: unknown }).emote : raw
  if (value === 'wave' || value === 'dance') return value
  return null
}

export function sanitizeColor(raw: unknown): import('./constants').ColorId | null {
  if (typeof raw !== 'string') return null
  const ids = ['coral', 'turquoise', 'mint', 'rose', 'sun', 'blue'] as const
  return ids.includes(raw as (typeof ids)[number]) ? (raw as (typeof ids)[number]) : null
}
