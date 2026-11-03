import type { AccessoryId, ColorId, FaceId, ProductType } from './constants'

export type Phase = 'lobby' | 'countdown' | 'playing' | 'results'

export type ProductState = 'shelf' | 'ground' | 'carried' | 'cart' | 'validated' | 'hidden'

export type ActionType = 'interact' | 'grab' | 'shove'

export type SfxType = 'pickup' | 'drop' | 'shove' | 'steal' | 'checkout' | 'legendary' | 'bump' | 'complete' | 'join'

export interface MoveInput {
  seq: number
  forward: number
  strafe: number
  yaw: number
  sprint: boolean
  jump: boolean
  interactHeld: boolean
}

export interface PublicPlayer {
  id: string
  name: string
  colorId: ColorId
  faceId: FaceId
  accessory: AccessoryId
  host: boolean
  ready: boolean
  connected: boolean
  x: number
  y: number
  z: number
  yaw: number
  vx: number
  vz: number
  grounded: boolean
  carryingId: string | null
  holdingCart: boolean
  score: number
  list: ProductType[]
  validated: Partial<Record<ProductType, number>>
  listBonus: boolean
  validatedItems: number
  stolen: number
  lost: number
  shoves: number
  hit: boolean
  slow: boolean
  stealing: number
}

export interface PublicProduct {
  id: string
  type: ProductType
  state: ProductState
  x: number
  y: number
  z: number
  ownerId: string | null
}

export interface PublicCart {
  id: string
  ownerId: string
  x: number
  z: number
  yaw: number
  held: boolean
  itemIds: string[]
}

export interface PublicChat {
  id: number
  playerId: string
  name: string
  text: string
  at: number
}

export interface PublicNotice {
  id: number
  text: string
  kind: 'steal' | 'info' | 'legendary' | 'score'
  targetId: string | null
  ttl: number
}

export interface PublicSfx {
  id: number
  type: SfxType
  x: number
  z: number
}

export interface PublicRoom {
  code: string
  phase: Phase
  round: number
  timeLeftMs: number
  endsAt: number
  serverNow: number
  players: PublicPlayer[]
  products: PublicProduct[]
  carts: PublicCart[]
  notices: PublicNotice[]
  chats: PublicChat[]
  sfx: PublicSfx[]
}

export interface ClientAck {
  ok: boolean
  error?: string
  playerId?: string
  token?: string
  code?: string
  state?: PublicRoom
}
