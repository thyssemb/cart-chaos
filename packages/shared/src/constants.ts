export const MATCH_MS = 180_000
export const COUNTDOWN_MS = 3_000
export const LEGENDARY_AT_MS = 90_000
export const TICK_MS = 50
export const MAX_PLAYERS = 6
export const MIN_PLAYERS = 1
export const CART_CAPACITY = 8
export const PLAYER_RADIUS = 0.36
export const CART_RADIUS = 0.42
export const CART_FOLLOW = 1.08
export const CONTROLLER = {
  walkSpeed: 7.8,
  sprintSpeed: 12.48,
  acceleration: 15,
  deceleration: 20,
  rotationSpeed: 8.2,
  keyTurnSpeed: 2.8,
  jumpImpulse: 6.35,
  airControl: 0.55,
  gravityScale: 1,
  coyote: 0.1,
  jumpLock: 0.22,
} as const
export const MOVE_SPEED = CONTROLLER.walkSpeed
export const SPRINT_SPEED = CONTROLLER.sprintSpeed
export const CART_SPEED_MUL = 0.94
export const SLOW_MUL = 0.6
export const JUMP_V = CONTROLLER.jumpImpulse
export const GRAVITY = 16
export const STEAL_MS = 1000
export const STEAL_RANGE = 1.9
export const PROTECT_RANGE = 2.45
export const INTERACT_RANGE = 1.85
export const GRAB_RANGE = 2.1
export const SHOVE_RANGE = 1.75
export const SHOVE_COOLDOWN_MS = 900
export const SHOVE_DIST = 0.95
export const RESPAWN_MS = 8_000
export const DISCONNECT_GRACE_MS = 45_000
export const EMPTY_ROOM_MS = 60_000
export const LIST_SIZE = 5
export const POINTS = {
  listed: 100,
  extra: 20,
  rare: 250,
  legendary: 1000,
  complete: 500,
} as const

export const COLORS = [
  { id: 'coral', label: 'Corail', hex: '#ff5d6c', hair: '#ff4d88', skin: '#ffd3a8' },
  { id: 'turquoise', label: 'Turquoise', hex: '#2ec4b6', hair: '#12b5c4', skin: '#ffd7b0' },
  { id: 'mint', label: 'Menthe', hex: '#5ee0a0', hair: '#3dd68c', skin: '#ffd8b4' },
  { id: 'rose', label: 'Rose', hex: '#ff6ec7', hair: '#ff5cbf', skin: '#ffd0b0' },
  { id: 'sun', label: 'Soleil', hex: '#ffd23f', hair: '#ffb703', skin: '#ffe0c0' },
  { id: 'blue', label: 'Bleu', hex: '#4d96ff', hair: '#3a7bff', skin: '#ffd5ae' },
] as const

export type ColorId = (typeof COLORS)[number]['id']

export const FACES = [
  { id: 'smile', label: 'Sourire' },
  { id: 'wink', label: 'Clin d’œil' },
  { id: 'grumpy', label: 'Bougon' },
  { id: 'wow', label: 'Surpris' },
  { id: 'cool', label: 'Cool' },
] as const

export type FaceId = (typeof FACES)[number]['id']

export const ACCESSORIES = [
  { id: 'none', label: 'Aucun' },
  { id: 'cap', label: 'Casquette' },
  { id: 'glasses', label: 'Lunettes' },
] as const

export type AccessoryId = (typeof ACCESSORIES)[number]['id']

export const PRODUCT_TYPES = [
  'milk',
  'bread',
  'eggs',
  'cheese',
  'banana',
  'cereal',
  'drink',
  'toilet',
  'frozen',
  'legendary',
] as const

export type ProductType = (typeof PRODUCT_TYPES)[number]

export type Rarity = 'common' | 'rare' | 'legendary'

export interface ProductDef {
  name: string
  rarity: Rarity
  color: string
  accent: string
}

export const CATALOG: Record<ProductType, ProductDef> = {
  milk: { name: 'Lait', rarity: 'common', color: '#f7fbff', accent: '#3d8bfd' },
  bread: { name: 'Pain', rarity: 'common', color: '#e7a15a', accent: '#8a4b1f' },
  eggs: { name: 'Œufs', rarity: 'common', color: '#f6e7c4', accent: '#e0b15a' },
  cheese: { name: 'Fromage', rarity: 'common', color: '#ffd15c', accent: '#f0a202' },
  banana: { name: 'Banane', rarity: 'common', color: '#ffe14d', accent: '#f5c518' },
  cereal: { name: 'Céréales', rarity: 'rare', color: '#ff8c42', accent: '#d7263d' },
  drink: { name: 'Boisson', rarity: 'common', color: '#2ec4b6', accent: '#146e68' },
  toilet: { name: 'Papier toilette', rarity: 'common', color: '#f7f7f2', accent: '#7eb6ff' },
  frozen: { name: 'Surgelé', rarity: 'common', color: '#b9e4ff', accent: '#3d7dff' },
  legendary: { name: 'PQ doré', rarity: 'legendary', color: '#ffd700', accent: '#fff4b0' },
}

export const LIST_POOL: ProductType[] = [
  'milk',
  'bread',
  'eggs',
  'cheese',
  'banana',
  'cereal',
  'drink',
  'toilet',
  'frozen',
]

export function colorById(id: string) {
  return COLORS.find((c) => c.id === id) ?? COLORS[0]
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function formatClock(ms: number) {
  const safe = Math.max(0, ms)
  const total = Math.ceil(safe / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
