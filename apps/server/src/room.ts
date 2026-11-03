import {
  CART_CAPACITY,
  CART_FOLLOW,
  CART_RADIUS,
  CATALOG,
  COLORS,
  COUNTDOWN_MS,
  DISCONNECT_GRACE_MS,
  GRAB_RANGE,
  HOMES,
  INTERACT_RANGE,
  LEGENDARY_AT_MS,
  LOBBY,
  LOBBY_OBSTACLES,
  LOBBY_SPAWNS,
  MATCH_MS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  OBSTACLES,
  PLAYER_RADIUS,
  PROTECT_RANGE,
  RESPAWN_MS,
  SHOVE_COOLDOWN_MS,
  SHOVE_DIST,
  SHOVE_RANGE,
  SPAWNS,
  STEAL_MS,
  STEAL_RANGE,
  cartAnchor,
  checkoutReady,
  collides,
  depenetrate,
  discObstacle,
  listBonus,
  makeRoomCode,
  mulberry32,
  pointsForItem,
  rollList,
  stealBanner,
  stepAvatar,
  zeroInput,
  type AccessoryId,
  type ActionType,
  type ColorId,
  type EmoteId,
  type FaceId,
  type MoveInput,
  type Phase,
  type ProductState,
  type ProductType,
  type PublicRoom,
  type SfxType,
} from '@cart-chaos/shared'

interface Player {
  id: string
  token: string
  name: string
  colorId: ColorId
  faceId: FaceId
  accessory: AccessoryId
  host: boolean
  ready: boolean
  connected: boolean
  goneMs: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  yaw: number
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
  hitMs: number
  slowMs: number
  shoveCd: number
  steal: { productId: string; elapsed: number; blocked: boolean } | null
  input: MoveInput
  lastInputAt: number
  chatAt: number[]
  emote: EmoteId | null
  emoteUntil: number
  emoteAt: number
}

interface Product {
  id: string
  type: ProductType
  state: ProductState
  x: number
  y: number
  z: number
  homeX: number
  homeY: number
  homeZ: number
  ownerId: string | null
  respawnIn: number
  scored: boolean
}

interface Cart {
  id: string
  ownerId: string
  x: number
  z: number
  yaw: number
  held: boolean
  itemIds: string[]
  dropCd: number
  vx: number
  vz: number
}

function rid() {
  return Math.random().toString(36).slice(2, 10)
}

function hashCode(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

export class Room {
  readonly code: string
  phase: Phase = 'lobby'
  round = 0
  timeLeftMs = 0
  emptyFor = 0
  players = new Map<string, Player>()
  products = new Map<string, Product>()
  carts = new Map<string, Cart>()
  notices: { id: number; text: string; kind: 'steal' | 'info' | 'legendary' | 'score'; targetId: string | null; ttl: number }[] = []
  chats: { id: number; playerId: string; name: string; text: string; at: number }[] = []
  sfx: { id: number; type: SfxType; x: number; z: number }[] = []
  private legendarySpawned = false
  private holdLobby = false
  private noticeSeq = 1
  private chatSeq = 1
  private sfxSeq = 1
  private rng = Math.random

  constructor(code: string) {
    this.code = code
    this.rng = mulberry32(hashCode(code))
    this.resetProducts()
  }

  connectedCount() {
    let n = 0
    for (const player of this.players.values()) if (player.connected) n += 1
    return n
  }

  addPlayer(
    name: string,
    look?: { colorId?: ColorId | null; faceId?: FaceId; accessory?: AccessoryId },
  ): { ok: true; player: Player; token: string } | { ok: false; error: string } {
    if (this.players.size >= MAX_PLAYERS) return { ok: false, error: 'Salon plein' }
    const id = `p_${rid()}`
    const token = `${rid()}${rid()}`
    const player = this.makePlayer(id, token, name, this.players.size === 0, look)
    this.players.set(id, player)
    this.carts.set(id, {
      id,
      ownerId: id,
      x: player.x + 0.2,
      z: player.z + 0.8,
      yaw: player.yaw,
      held: false,
      itemIds: [],
      dropCd: 0,
      vx: 0,
      vz: 0,
    })
    const inStore = this.phase === 'playing' || (this.phase === 'countdown' && !this.holdLobby)
    if (inStore) {
      player.list = rollList(this.rng)
      player.holdingCart = true
      this.placeCart(player)
    }
    this.notify(`${player.name} ${inStore ? 'entre dans le magasin' : 'arrive en salle de pause'}`, 'info', null, 2200)
    this.pushSfx('join', player.x, player.z)
    return { ok: true, player, token }
  }

  rejoin(token: string) {
    for (const player of this.players.values()) {
      if (player.token !== token) continue
      player.connected = true
      player.goneMs = 0
      return player
    }
    return null
  }

  disconnect(playerId: string) {
    const player = this.players.get(playerId)
    if (!player || !player.connected) return
    player.connected = false
    player.goneMs = 0
    player.holdingCart = false
    player.input = zeroInput(player.yaw)
    player.steal = null
    const cart = this.carts.get(player.id)
    if (cart) cart.held = false
    if (player.carryingId) {
      const product = this.products.get(player.carryingId)
      if (product) this.dropProduct(product, player.x, player.z)
      player.carryingId = null
    }
  }

  remove(playerId: string) {
    const player = this.players.get(playerId)
    if (!player) return
    this.disconnect(playerId)
    this.players.delete(playerId)
    if (player.host) {
      const next = [...this.players.values()].find((p) => p.connected) ?? [...this.players.values()][0]
      if (next) next.host = true
    }
  }

  setReady(playerId: string) {
    const player = this.players.get(playerId)
    if (!player || this.phase !== 'lobby') return { ok: false, error: 'Pas maintenant' }
    player.ready = !player.ready
    return { ok: true }
  }

  setColor(playerId: string, colorId: ColorId) {
    const player = this.players.get(playerId)
    if (!player) return { ok: false, error: 'Joueur absent' }
    if (this.phase !== 'lobby') return { ok: false, error: 'Pas maintenant' }
    const taken = [...this.players.values()].some((p) => p.id !== player.id && p.colorId === colorId)
    if (taken) return { ok: false, error: 'Couleur prise' }
    player.colorId = colorId
    return { ok: true }
  }

  setLook(playerId: string, look: { colorId: ColorId; faceId: FaceId; accessory: AccessoryId }) {
    const player = this.players.get(playerId)
    if (!player) return { ok: false, error: 'Joueur absent' }
    if (this.phase !== 'lobby' && this.phase !== 'results') return { ok: false, error: 'Pas maintenant' }
    if (look.colorId !== player.colorId) {
      const taken = [...this.players.values()].some((other) => other.id !== player.id && other.colorId === look.colorId)
      if (taken) return { ok: false, error: 'Couleur prise' }
      player.colorId = look.colorId
    }
    player.faceId = look.faceId
    player.accessory = look.accessory
    return { ok: true }
  }

  say(playerId: string, text: string) {
    const player = this.players.get(playerId)
    if (!player?.connected) return { ok: false, error: 'Joueur absent' }
    if (this.phase !== 'lobby') return { ok: false, error: 'Le chat est réservé au salon' }
    const now = Date.now()
    player.chatAt = player.chatAt.filter((at) => now - at < 5000)
    if (player.chatAt.length >= 3) return { ok: false, error: 'Doucement' }
    player.chatAt.push(now)
    this.chatSeq += 1
    this.chats.push({ id: this.chatSeq, playerId: player.id, name: player.name, text, at: now })
    if (this.chats.length > 24) this.chats.shift()
    return { ok: true }
  }

  setEmote(playerId: string, emote: EmoteId) {
    const player = this.players.get(playerId)
    if (!player?.connected) return { ok: false, error: 'Joueur absent' }
    if (this.phase !== 'lobby') return { ok: false, error: 'Pas maintenant' }
    const now = Date.now()
    if (now - player.emoteAt < 450) return { ok: false, error: 'Doucement' }
    player.emote = emote
    player.emoteAt = now
    player.emoteUntil = now + (emote === 'dance' ? 3400 : 1500)
    return { ok: true }
  }

  setInput(playerId: string, input: MoveInput) {
    const player = this.players.get(playerId)
    if (!player || !player.connected) return
    if (this.phase === 'lobby') {
      player.input = input
      player.lastInputAt = Date.now()
      return
    }
    if (this.phase !== 'playing') {
      player.yaw = input.yaw
      player.input = zeroInput(input.yaw)
      return
    }
    player.input = input
    player.lastInputAt = Date.now()
  }

  handleAction(playerId: string, type: ActionType): { ok: boolean; error?: string } {
    const player = this.players.get(playerId)
    if (!player?.connected) return { ok: false, error: 'Joueur absent' }
    if (this.phase !== 'playing') return { ok: false, error: 'Pas maintenant' }
    if (type === 'grab') return this.toggleGrab(player)
    if (type === 'shove') return this.shove(player)
    return this.interact(player)
  }

  start(playerId: string) {
    if (this.phase !== 'lobby' && this.phase !== 'results') return { ok: false, error: 'Pas maintenant' }
    if (!this.canControl(playerId)) return { ok: false, error: 'Seul l’hôte peut lancer' }
    if (this.connectedCount() < MIN_PLAYERS) return { ok: false, error: 'Il faut au moins 1 joueur' }
    if (this.phase === 'lobby' && [...this.players.values()].some((player) => player.connected && !player.ready)) {
      return { ok: false, error: 'Tout le monde doit être prêt' }
    }
    if (this.phase === 'lobby') this.armFromLobby()
    else this.beginRound()
    return { ok: true }
  }

  rematch(playerId: string) {
    return this.start(playerId)
  }

  backToLobby(playerId: string) {
    if (this.phase !== 'results') return { ok: false, error: 'Pas maintenant' }
    if (!this.canControl(playerId)) return { ok: false, error: 'Seul l’hôte peut ramener le salon' }
    this.phase = 'lobby'
    this.timeLeftMs = 0
    this.holdLobby = false
    this.notices = []
    let index = 0
    for (const player of this.players.values()) {
      const spawn = LOBBY_SPAWNS[index % LOBBY_SPAWNS.length]!
      index += 1
      player.x = spawn.x
      player.y = 0
      player.z = spawn.z
      player.vx = 0
      player.vy = 0
      player.vz = 0
      player.yaw = spawn.yaw
      player.grounded = true
      player.carryingId = null
      player.holdingCart = false
      player.ready = false
      player.score = 0
      player.list = []
      player.validated = {}
      player.listBonus = false
      player.steal = null
      player.emote = null
      player.emoteUntil = 0
      player.input = zeroInput(spawn.yaw)
      const cart = this.carts.get(player.id)
      if (cart) {
        cart.held = false
        cart.itemIds = []
        cart.vx = 0
        cart.vz = 0
        cart.x = spawn.x
        cart.z = spawn.z + 0.8
        cart.yaw = spawn.yaw
      }
    }
    this.notify('Retour en salle de pause', 'info', null, 1800)
    return { ok: true }
  }

  tick(dtMs: number) {
    let left = Math.max(0, dtMs)
    while (left > 0) {
      const step = Math.min(50, left)
      this.step(step)
      left -= step
    }
  }

  snapshot(): PublicRoom {
    const serverNow = Date.now()
    const running = this.phase === 'playing' || this.phase === 'countdown'
    return {
      code: this.code,
      phase: this.phase,
      round: this.round,
      timeLeftMs: Math.max(0, this.timeLeftMs),
      endsAt: running ? serverNow + Math.max(0, this.timeLeftMs) : 0,
      serverNow,
      players: [...this.players.values()].map((player) => ({
        id: player.id,
        name: player.name,
        colorId: player.colorId,
        faceId: player.faceId,
        accessory: player.accessory,
        host: player.host,
        ready: player.ready,
        connected: player.connected,
        x: round3(player.x),
        y: round3(player.y),
        z: round3(player.z),
        yaw: round3(player.yaw),
        vx: round3(player.vx),
        vz: round3(player.vz),
        grounded: player.grounded,
        carryingId: player.carryingId,
        holdingCart: player.holdingCart,
        score: player.score,
        list: player.list,
        validated: player.validated,
        listBonus: player.listBonus,
        validatedItems: player.validatedItems,
        stolen: player.stolen,
        lost: player.lost,
        shoves: player.shoves,
        hit: player.hitMs > 0,
        slow: player.slowMs > 0,
        stealing: player.steal && !player.steal.blocked ? Math.min(1, player.steal.elapsed / STEAL_MS) : 0,
        emote: player.emoteUntil > serverNow ? player.emote : null,
      })),
      products: [...this.products.values()].map((product) => ({
        id: product.id,
        type: product.type,
        state: product.state,
        x: round3(product.x),
        y: round3(product.y),
        z: round3(product.z),
        ownerId: product.ownerId,
      })),
      carts: [...this.carts.values()].map((cart) => ({
        id: cart.id,
        ownerId: cart.ownerId,
        x: round3(cart.x),
        z: round3(cart.z),
        yaw: round3(cart.yaw),
        held: cart.held,
        itemIds: [...cart.itemIds],
      })),
      notices: this.notices.map((notice) => ({ ...notice })),
      chats: this.chats.map((chat) => ({ ...chat })),
      sfx: this.sfx.slice(-8),
    }
  }

  private step(dtMs: number) {
    const anyone = this.connectedCount() > 0
    this.emptyFor = anyone ? 0 : this.emptyFor + dtMs
    for (const notice of this.notices) notice.ttl -= dtMs
    this.notices = this.notices.filter((notice) => notice.ttl > 0).slice(-8)

    for (const player of [...this.players.values()]) {
      if (player.connected) player.goneMs = 0
      else {
        player.goneMs += dtMs
        if (player.goneMs >= DISCONNECT_GRACE_MS) this.remove(player.id)
      }
    }

    if (this.phase === 'lobby') {
      this.simulateLobby(dtMs)
      return
    }
    if (this.phase === 'countdown') {
      this.timeLeftMs -= dtMs
      if (this.timeLeftMs <= 0) {
        if (this.holdLobby) this.enterStore()
        this.phase = 'playing'
        this.timeLeftMs = MATCH_MS
      }
      return
    }
    if (this.phase !== 'playing') return
    this.simulate(dtMs)
  }

  private simulateLobby(dtMs: number) {
    const dt = dtMs / 1000
    const now = Date.now()
    const live = [...this.players.values()].filter((player) => player.connected)
    for (const player of live) {
      if (now - player.lastInputAt > 280) {
        player.input = { ...player.input, forward: 0, strafe: 0, sprint: false, jump: false, interactHeld: false }
      }
      if (player.emoteUntil <= now) player.emote = null
      stepAvatar(player, player.input, dt, LOBBY_OBSTACLES, { holding: false, slow: false, bounds: LOBBY })
    }
    for (let i = 0; i < live.length; i += 1) {
      for (let j = i + 1; j < live.length; j += 1) {
        const a = live[i]!
        const b = live[j]!
        let dx = b.x - a.x
        let dz = b.z - a.z
        let dist = Math.hypot(dx, dz)
        const min = PLAYER_RADIUS * 2
        if (dist < 1e-4) {
          dx = 1
          dz = 0
          dist = 1
        }
        if (dist >= min) continue
        const push = (min - dist) / 2
        const nx = dx / dist
        const nz = dz / dist
        a.x -= nx * push
        a.z -= nz * push
        b.x += nx * push
        b.z += nz * push
      }
    }
    for (const player of live) {
      const safe = depenetrate(player.x, player.z, PLAYER_RADIUS, LOBBY_OBSTACLES, LOBBY)
      player.x = safe.x
      player.z = safe.z
    }
  }

  private simulate(dtMs: number) {
    this.timeLeftMs = Math.max(0, this.timeLeftMs - dtMs)
    const dt = dtMs / 1000
    this.maybeSpawnLegendary()

    const live = [...this.players.values()].filter((player) => player.connected)
    for (const player of live) {
      player.hitMs = Math.max(0, player.hitMs - dtMs)
      player.slowMs = Math.max(0, player.slowMs - dtMs)
      player.shoveCd = Math.max(0, player.shoveCd - dtMs)
      if (Date.now() - player.lastInputAt > 280) {
        player.input = { ...player.input, forward: 0, strafe: 0, sprint: false, jump: false, interactHeld: false }
      }
      const extras = [...this.carts.values()]
        .filter((cart) => !(player.holdingCart && cart.ownerId === player.id))
        .map((cart) => discObstacle(cart.x, cart.z, CART_RADIUS, cart.id))
      stepAvatar(player, player.input, dt, OBSTACLES, {
        holding: player.holdingCart,
        slow: player.slowMs > 0,
        extras,
      })
      const cart = this.carts.get(player.id)
      if (cart && player.holdingCart) {
        const anchor = cartAnchor(player.x, player.z, player.yaw)
        cart.x = anchor.x
        cart.z = anchor.z
        cart.yaw = player.yaw
        cart.held = true
      } else if (cart) cart.held = false
    }

    for (let i = 0; i < live.length; i += 1) {
      for (let j = i + 1; j < live.length; j += 1) {
        const a = live[i]!
        const b = live[j]!
        let dx = b.x - a.x
        let dz = b.z - a.z
        let dist = Math.hypot(dx, dz)
        const min = PLAYER_RADIUS * 2
        if (dist < 1e-4) {
          dx = 1
          dz = 0
          dist = 1
        }
        if (dist >= min) continue
        const push = (min - dist) / 2
        const nx = dx / dist
        const nz = dz / dist
        a.x -= nx * push
        a.z -= nz * push
        b.x += nx * push
        b.z += nz * push
      }
    }

    for (const player of live) {
      const safe = depenetrate(player.x, player.z, PLAYER_RADIUS, OBSTACLES)
      player.x = safe.x
      player.z = safe.z
      if (!player.holdingCart) continue
      const cart = this.carts.get(player.id)
      if (!cart) continue
      const anchor = cartAnchor(player.x, player.z, player.yaw)
      if (!collides(anchor.x, anchor.z, CART_RADIUS, OBSTACLES)) {
        cart.x = anchor.x
        cart.z = anchor.z
        cart.yaw = player.yaw
      } else {
        player.x = cart.x - Math.sin(player.yaw) * CART_FOLLOW
        player.z = cart.z - Math.cos(player.yaw) * CART_FOLLOW
        const back = depenetrate(player.x, player.z, PLAYER_RADIUS, OBSTACLES)
        player.x = back.x
        player.z = back.z
      }
    }

    for (const cart of this.carts.values()) {
      cart.dropCd = Math.max(0, cart.dropCd - dtMs)
      if (cart.held) {
        cart.vx = 0
        cart.vz = 0
        continue
      }
      const slide = Math.hypot(cart.vx, cart.vz)
      if (slide > 0.08) {
        const nx = cart.x + cart.vx * dt
        const nz = cart.z + cart.vz * dt
        if (!collides(nx, nz, CART_RADIUS, OBSTACLES)) {
          cart.x = nx
          cart.z = nz
        } else {
          cart.vx *= -0.2
          cart.vz *= -0.2
        }
        const damp = Math.exp(-3.6 * dt)
        cart.vx *= damp
        cart.vz *= damp
      } else {
        cart.vx = 0
        cart.vz = 0
      }
      for (const player of live) {
        const dist = Math.hypot(cart.x - player.x, cart.z - player.z)
        const speed = Math.hypot(player.vx, player.vz)
        if (dist < CART_RADIUS + PLAYER_RADIUS && dist > 0.001 && speed > 0.4) {
          cart.x += player.vx * dt * 0.9
          cart.z += player.vz * dt * 0.9
        }
      }
      const safe = depenetrate(cart.x, cart.z, CART_RADIUS, OBSTACLES)
      cart.x = safe.x
      cart.z = safe.z
    }

    for (const cart of this.carts.values()) {
      if (cart.dropCd > 0 || cart.itemIds.length === 0) continue
      for (const player of live) {
        if (player.holdingCart && player.id === cart.ownerId) continue
        const dist = Math.hypot(player.x - cart.x, player.z - cart.z)
        const speed = Math.hypot(player.vx, player.vz)
        if (dist < CART_RADIUS + PLAYER_RADIUS + 0.08 && speed > 3.6) {
          this.dropOneFromCart(cart)
          cart.dropCd = 800
          this.pushSfx('bump', cart.x, cart.z)
          break
        }
      }
    }

    for (const player of live) {
      if (!player.carryingId) continue
      const product = this.products.get(player.carryingId)
      if (!product || product.state !== 'carried') {
        player.carryingId = null
        continue
      }
      product.x = player.x + Math.sin(player.yaw) * 0.45
      product.z = player.z + Math.cos(player.yaw) * 0.45
      product.y = 1.2 + player.y
    }

    for (const player of live) this.updateSteal(player, dtMs)

    for (const product of this.products.values()) {
      if (product.state !== 'validated' || product.respawnIn <= 0) continue
      product.respawnIn -= dtMs
      if (product.respawnIn > 0) continue
      product.state = 'shelf'
      product.x = product.homeX
      product.y = product.homeY
      product.z = product.homeZ
      product.ownerId = null
      product.scored = false
    }

    if (this.timeLeftMs <= 0) {
      this.phase = 'results'
      this.timeLeftMs = 0
      for (const player of this.players.values()) {
        player.holdingCart = false
        player.input = zeroInput(player.yaw)
        player.steal = null
      }
    }
  }

  private maybeSpawnLegendary() {
    if (this.legendarySpawned || this.timeLeftMs > LEGENDARY_AT_MS) return
    this.legendarySpawned = true
    const legendary = this.products.get('legendary')
    if (!legendary || legendary.state !== 'hidden') return
    legendary.state = 'shelf'
    legendary.x = legendary.homeX
    legendary.y = legendary.homeY
    legendary.z = legendary.homeZ
    legendary.ownerId = null
    legendary.scored = false
    this.notify('PQ DORÉ DANS LA ZONE PROMO !', 'legendary', null, 5000)
    this.pushSfx('legendary', legendary.x, legendary.z)
  }

  private updateSteal(player: Player, dtMs: number) {
    if (!player.input.interactHeld || player.carryingId) {
      player.steal = null
      return
    }
    const cart = this.nearestEnemyCart(player)
    if (!cart) {
      player.steal = null
      return
    }
    const owner = this.players.get(cart.ownerId)
    const protecting = !!owner?.connected && Math.hypot(owner.x - cart.x, owner.z - cart.z) <= PROTECT_RANGE
    const productId = this.pickStealItem(cart, player)
    if (!productId || protecting) {
      if (protecting && (!player.steal || !player.steal.blocked)) {
        this.notify('Caddie protégé !', 'info', player.id, 1200)
      }
      player.steal = protecting ? { productId: productId ?? '', elapsed: 0, blocked: true } : null
      return
    }
    if (!player.steal || player.steal.productId !== productId || player.steal.blocked) {
      player.steal = { productId, elapsed: 0, blocked: false }
    }
    player.steal.elapsed += dtMs
    if (player.steal.elapsed < STEAL_MS) return
    const product = this.products.get(productId)
    if (!product || product.state !== 'cart') {
      player.steal = null
      return
    }
    cart.itemIds = cart.itemIds.filter((id) => id !== product.id)
    product.state = 'carried'
    product.ownerId = player.id
    player.carryingId = product.id
    player.stolen += 1
    if (owner) owner.lost += 1
    player.steal = null
    const label = CATALOG[product.type].name
    this.notify(stealBanner(player.name, label), 'steal', owner?.id ?? null, 4200)
    this.notify(`${player.name} vole ${label}`, 'info', null, 2500)
    this.pushSfx('steal', player.x, player.z)
  }

  private interact(player: Player): { ok: boolean; error?: string } {
    const cart = this.carts.get(player.id)
    if (!cart) return { ok: false, error: 'Pas de caddie' }
    const zone = checkoutReady(player.x, player.z, cart.x, cart.z)
    if (zone && (cart.itemIds.length > 0 || player.carryingId)) return this.checkout(player)
    if (player.carryingId) {
      const product = this.products.get(player.carryingId)
      if (!product) {
        player.carryingId = null
        return { ok: false, error: 'Produit perdu' }
      }
      if (Math.hypot(player.x - cart.x, player.z - cart.z) <= INTERACT_RANGE + 0.35) return this.deposit(player, product, cart)
      this.dropProduct(product, player.x + Math.sin(player.yaw) * 0.55, player.z + Math.cos(player.yaw) * 0.55)
      player.carryingId = null
      this.pushSfx('drop', player.x, player.z)
      return { ok: true }
    }
    const loose = this.nearestLoose(player)
    if (loose) return this.pickup(player, loose)
    if (this.nearestEnemyCart(player)) return { ok: true }
    return { ok: false, error: 'Rien à portée' }
  }

  private pickup(player: Player, product: Product) {
    if (player.carryingId) return { ok: false, error: 'Mains prises' }
    if (product.state !== 'shelf' && product.state !== 'ground') return { ok: false, error: 'Introuvable' }
    for (const cart of this.carts.values()) cart.itemIds = cart.itemIds.filter((id) => id !== product.id)
    product.state = 'carried'
    product.ownerId = player.id
    player.carryingId = product.id
    this.pushSfx('pickup', player.x, player.z)
    return { ok: true }
  }

  private deposit(player: Player, product: Product, cart: Cart) {
    if (cart.itemIds.length >= CART_CAPACITY) return { ok: false, error: 'Caddie plein' }
    if (product.state !== 'carried') return { ok: false, error: 'Pas dans les mains' }
    product.state = 'cart'
    product.ownerId = player.id
    cart.itemIds.push(product.id)
    player.carryingId = null
    this.pushSfx('drop', cart.x, cart.z)
    return { ok: true }
  }

  private checkout(player: Player) {
    const cart = this.carts.get(player.id)
    if (!cart) return { ok: false, error: 'Pas de caddie' }
    const ids = [...cart.itemIds]
    if (player.carryingId && !ids.includes(player.carryingId)) ids.push(player.carryingId)
    if (ids.length === 0) return { ok: false, error: 'Caddie vide' }
    let gained = 0
    const names: string[] = []
    for (const id of ids) {
      const product = this.products.get(id)
      if (!product || product.scored) continue
      if (product.state !== 'cart' && product.state !== 'carried') continue
      const result = pointsForItem(product.type, player.list, player.validated)
      product.scored = true
      product.state = 'validated'
      product.ownerId = player.id
      product.respawnIn = product.type === 'legendary' ? 0 : RESPAWN_MS
      cart.itemIds = cart.itemIds.filter((itemId) => itemId !== id)
      if (player.carryingId === id) player.carryingId = null
      if (result.fulfills) player.validated[product.type] = (player.validated[product.type] ?? 0) + 1
      player.score += result.points
      player.validatedItems += 1
      gained += result.points
      names.push(CATALOG[product.type].name)
    }
    const bonus = listBonus(player.list, player.validated, player.listBonus)
    if (bonus > 0) {
      player.listBonus = true
      player.score += bonus
      gained += bonus
      this.notify(`${player.name.toLocaleUpperCase('fr-FR')} complète sa liste ! +500`, 'score', null, 3500)
      this.pushSfx('complete', player.x, player.z)
    }
    if (gained <= 0) return { ok: false, error: 'Rien à encaisser' }
    this.notify(`+${gained} ${names.slice(0, 3).join(', ')}`, 'score', player.id, 2200)
    this.pushSfx('checkout', player.x, player.z)
    return { ok: true }
  }

  private toggleGrab(player: Player) {
    const cart = this.carts.get(player.id)
    if (!cart) return { ok: false, error: 'Pas de caddie' }
    if (player.holdingCart) {
      player.holdingCart = false
      cart.held = false
      cart.vx = player.vx * 0.8
      cart.vz = player.vz * 0.8
      return { ok: true }
    }
    if (Math.hypot(player.x - cart.x, player.z - cart.z) > GRAB_RANGE) return { ok: false, error: 'Caddie trop loin' }
    const extras = [...this.carts.values()]
      .filter((other) => other.id !== cart.id)
      .map((other) => discObstacle(other.x, other.z, CART_RADIUS, other.id))
    const anchor = cartAnchor(player.x, player.z, player.yaw)
    if (collides(anchor.x, anchor.z, CART_RADIUS, OBSTACLES.concat(extras))) {
      return { ok: false, error: 'Pas de place pour le caddie' }
    }
    player.holdingCart = true
    cart.held = true
    cart.vx = 0
    cart.vz = 0
    cart.x = anchor.x
    cart.z = anchor.z
    cart.yaw = player.yaw
    return { ok: true }
  }

  private shove(player: Player) {
    if (player.shoveCd > 0) return { ok: false, error: 'Pas encore' }
    const fx = Math.sin(player.yaw)
    const fz = Math.cos(player.yaw)
    let target: Player | null = null
    let best = SHOVE_RANGE
    for (const other of this.players.values()) {
      if (other.id === player.id || !other.connected) continue
      const dx = other.x - player.x
      const dz = other.z - player.z
      const dist = Math.hypot(dx, dz)
      if (dist > best || dist < 0.05) continue
      const dot = (dx / dist) * fx + (dz / dist) * fz
      if (dot < 0.2) continue
      best = dist
      target = other
    }
    if (!target) return { ok: false, error: 'Personne à portée' }
    player.shoveCd = SHOVE_COOLDOWN_MS
    player.shoves += 1
    target.hitMs = 340
    target.slowMs = 380
    target.vx += fx * 3.5
    target.vz += fz * 3.5
    target.x += fx * SHOVE_DIST
    target.z += fz * SHOVE_DIST
    const safe = depenetrate(target.x, target.z, PLAYER_RADIUS, OBSTACLES)
    target.x = safe.x
    target.z = safe.z
    if (target.carryingId) {
      const product = this.products.get(target.carryingId)
      if (product) this.dropProduct(product, target.x, target.z)
      target.carryingId = null
    }
    const cart = this.carts.get(target.id)
    if (cart && cart.itemIds.length > 0 && (target.holdingCart || Math.hypot(target.x - cart.x, target.z - cart.z) < 1.5)) {
      this.dropOneFromCart(cart)
      cart.dropCd = 700
    }
    target.holdingCart = false
    if (cart) {
      cart.held = false
      cart.vx = fx * 1.5
      cart.vz = fz * 1.5
    }
    this.pushSfx('shove', target.x, target.z)
    return { ok: true }
  }

  private nearestLoose(player: Player) {
    let best: Product | null = null
    // The cart stops the body short of the shelf, and the package extends in front of its center.
    let bestDist = INTERACT_RANGE + 0.75
    for (const product of this.products.values()) {
      if (product.state !== 'shelf' && product.state !== 'ground') continue
      const dist = Math.hypot(player.x - product.x, player.z - product.z)
      if (dist < bestDist) {
        best = product
        bestDist = dist
      }
    }
    return best
  }

  private nearestEnemyCart(player: Player) {
    let best: Cart | null = null
    let bestDist = STEAL_RANGE
    for (const cart of this.carts.values()) {
      if (cart.ownerId === player.id || cart.itemIds.length === 0) continue
      const dist = Math.hypot(player.x - cart.x, player.z - cart.z)
      if (dist < bestDist) {
        best = cart
        bestDist = dist
      }
    }
    return best
  }

  private pickStealItem(cart: Cart, thief: Player) {
    const needed = new Set(
      thief.list.filter((type) => (thief.validated[type] ?? 0) < thief.list.filter((item) => item === type).length),
    )
    for (const id of cart.itemIds) {
      const product = this.products.get(id)
      if (product?.state === 'cart' && needed.has(product.type)) return id
    }
    for (let i = cart.itemIds.length - 1; i >= 0; i -= 1) {
      const id = cart.itemIds[i]!
      const product = this.products.get(id)
      if (product?.state === 'cart') return id
    }
    return null
  }

  private dropOneFromCart(cart: Cart) {
    const id = cart.itemIds[cart.itemIds.length - 1]
    if (!id) return
    const product = this.products.get(id)
    if (!product) return
    cart.itemIds.pop()
    const angle = this.rng() * Math.PI * 2
    this.dropProduct(product, cart.x + Math.cos(angle) * 0.75, cart.z + Math.sin(angle) * 0.75)
  }

  private dropProduct(product: Product, x: number, z: number) {
    const safe = depenetrate(x, z, 0.2, OBSTACLES)
    product.state = 'ground'
    product.ownerId = null
    product.x = safe.x
    product.y = 0.32
    product.z = safe.z
  }

  private beginRound() {
    this.round += 1
    this.phase = 'countdown'
    this.timeLeftMs = COUNTDOWN_MS
    this.holdLobby = false
    this.seatForMatch()
    this.notify(`Manche ${this.round}`, 'info', null, 1800)
  }

  private armFromLobby() {
    this.round += 1
    this.phase = 'countdown'
    this.timeLeftMs = COUNTDOWN_MS
    this.holdLobby = true
    this.legendarySpawned = false
    for (const player of this.players.values()) {
      player.vx = 0
      player.vy = 0
      player.vz = 0
      player.steal = null
      player.holdingCart = false
      player.input = zeroInput(player.yaw)
    }
    this.notify(`Manche ${this.round}`, 'info', null, 1800)
  }

  private enterStore() {
    this.holdLobby = false
    this.seatForMatch()
  }

  private seatForMatch() {
    this.legendarySpawned = false
    this.rng = mulberry32(hashCode(this.code) + this.round * 9973)
    this.resetProducts()
    let index = 0
    for (const player of this.players.values()) {
      const spawn = SPAWNS[index % SPAWNS.length]!
      index += 1
      player.x = spawn.x
      player.y = 0
      player.z = spawn.z
      player.vx = 0
      player.vy = 0
      player.vz = 0
      player.yaw = spawn.yaw
      player.grounded = true
      player.carryingId = null
      player.holdingCart = true
      player.score = 0
      player.validated = {}
      player.listBonus = false
      player.validatedItems = 0
      player.stolen = 0
      player.lost = 0
      player.shoves = 0
      player.hitMs = 0
      player.slowMs = 0
      player.shoveCd = 0
      player.steal = null
      player.ready = false
      player.emote = null
      player.emoteUntil = 0
      player.list = rollList(this.rng)
      player.input = zeroInput(spawn.yaw)
      this.placeCart(player)
    }
  }

  private resetProducts() {
    this.products.clear()
    for (const home of HOMES) {
      this.products.set(home.id, {
        id: home.id,
        type: home.type,
        state: home.type === 'legendary' ? 'hidden' : 'shelf',
        x: home.x,
        y: home.y,
        z: home.z,
        homeX: home.x,
        homeY: home.y,
        homeZ: home.z,
        ownerId: null,
        respawnIn: 0,
        scored: false,
      })
    }
  }

  private placeCart(player: Player) {
    const cart = this.carts.get(player.id)
    if (!cart) return
    const anchor = cartAnchor(player.x, player.z, player.yaw)
    cart.x = anchor.x
    cart.z = anchor.z
    cart.yaw = player.yaw
    cart.held = true
    cart.itemIds = []
    cart.dropCd = 0
    cart.vx = 0
    cart.vz = 0
    player.holdingCart = true
  }

  private makePlayer(
    id: string,
    token: string,
    name: string,
    host: boolean,
    look?: { colorId?: ColorId | null; faceId?: FaceId; accessory?: AccessoryId },
  ): Player {
    const inStore = this.phase === 'playing' || (this.phase === 'countdown' && !this.holdLobby)
    const spots = inStore ? SPAWNS : LOBBY_SPAWNS
    const spawn = spots[this.players.size % spots.length]!
    return {
      id,
      token,
      name,
      colorId: this.pickColor(look?.colorId),
      faceId: look?.faceId ?? 'smile',
      accessory: look?.accessory ?? 'none',
      host,
      ready: false,
      connected: true,
      goneMs: 0,
      x: spawn.x,
      y: 0,
      z: spawn.z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: spawn.yaw,
      grounded: true,
      carryingId: null,
      holdingCart: false,
      score: 0,
      list: [],
      validated: {},
      listBonus: false,
      validatedItems: 0,
      stolen: 0,
      lost: 0,
      shoves: 0,
      hitMs: 0,
      slowMs: 0,
      shoveCd: 0,
      steal: null,
      input: zeroInput(spawn.yaw),
      lastInputAt: 0,
      chatAt: [],
      emote: null,
      emoteUntil: 0,
      emoteAt: 0,
    }
  }

  private pickColor(wanted?: ColorId | null): ColorId {
    if (wanted && ![...this.players.values()].some((player) => player.colorId === wanted)) return wanted
    return this.freeColor()
  }

  private freeColor(): ColorId {
    const used = new Set([...this.players.values()].map((player) => player.colorId))
    return COLORS.find((color) => !used.has(color.id))?.id ?? 'coral'
  }

  private canControl(playerId: string) {
    const asker = this.players.get(playerId)
    if (!asker?.connected) return false
    const host = [...this.players.values()].find((player) => player.host && player.connected)
    if (!host) return true
    return host.id === playerId
  }

  private notify(text: string, kind: 'steal' | 'info' | 'legendary' | 'score', targetId: string | null, ttl = 3000) {
    this.noticeSeq += 1
    this.notices.push({ id: this.noticeSeq, text, kind, targetId, ttl })
    if (this.notices.length > 8) this.notices.shift()
  }

  private pushSfx(type: SfxType, x: number, z: number) {
    this.sfxSeq += 1
    this.sfx.push({ id: this.sfxSeq, type, x, z })
    if (this.sfx.length > 12) this.sfx.shift()
  }
}

export class Rooms {
  private rooms = new Map<string, Room>()

  create(name: string, look?: { colorId?: ColorId | null; faceId?: FaceId; accessory?: AccessoryId }) {
    let code = makeRoomCode()
    while (this.rooms.has(code)) code = makeRoomCode()
    const room = new Room(code)
    this.rooms.set(code, room)
    const joined = room.addPlayer(name, look)
    if (!joined.ok) throw new Error(joined.error)
    return { room, player: joined.player, token: joined.token }
  }

  get(code: string) {
    return this.rooms.get(code) ?? null
  }

  delete(code: string) {
    this.rooms.delete(code)
  }

  all() {
    return [...this.rooms.values()]
  }
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000
}
