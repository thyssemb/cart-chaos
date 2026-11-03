import {
  CART_CAPACITY,
  checkoutReady,
  formatClock,
  INTERACT_RANGE,
  listRows,
  STEAL_RANGE,
  type ProductType,
} from '@cart-chaos/shared'
import { useEffect, useRef, useState } from 'react'
import { playEnd, playUi, playVictory } from '../audio'
import { sendLeave, sendRematch } from '../net'
import { useGame } from '../store'

export function Hud() {
  const room = useGame((state) => state.room)
  const playerId = useGame((state) => state.playerId)
  const paused = useGame((state) => state.paused)
  const flash = useGame((state) => state.flash)
  const flashAt = useGame((state) => state.flashAt)
  const clockOffset = useGame((state) => state.clockOffset)
  const [now, setNow] = useState(() => Date.now())
  const [seenResult, setSeenResult] = useState(0)
  const countTick = useRef<number | null>(null)
  const startedRound = useRef(0)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!room || room.phase !== 'results' || room.round === seenResult) return
    setSeenResult(room.round)
    const me = room.players.find((player) => player.id === playerId)
    const best = Math.max(0, ...room.players.map((player) => player.score))
    if (me && me.score === best) playVictory()
    else playEnd()
  }, [room, playerId, seenResult])

  useEffect(() => {
    if (!room) return
    if (room.phase === 'countdown') {
      const sec = Math.max(1, Math.ceil(Math.max(0, room.endsAt - (Date.now() + clockOffset)) / 1000))
      if (countTick.current !== null && countTick.current !== sec) playUi('count')
      countTick.current = sec
      return
    }
    countTick.current = null
    if (room.phase === 'playing' && startedRound.current !== room.round) {
      startedRound.current = room.round
      playUi('start')
    }
  }, [room, clockOffset])

  if (!room || !playerId) return null
  const me = room.players.find((player) => player.id === playerId)
  if (!me) return null
  if (room.phase === 'results') return <Results />

  const cart = room.carts.find((item) => item.ownerId === me.id)
  const pocket: ProductType[] = []
  for (const id of cart?.itemIds ?? []) {
    const product = room.products.find((item) => item.id === id)
    if (product) pocket.push(product.type)
  }
  if (me.carryingId) {
    const carried = room.products.find((item) => item.id === me.carryingId)
    if (carried) pocket.push(carried.type)
  }
  const rows = listRows(me.list, me.validated, pocket)
  const count = cart?.itemIds.length ?? 0
  const left = room.phase === 'playing' || room.phase === 'countdown' ? Math.max(0, room.endsAt - (now + clockOffset)) : 0
  const steal = [...room.notices].reverse().find((notice) => notice.kind === 'steal' && notice.targetId === me.id)
  const legendary = [...room.notices].reverse().find((notice) => notice.kind === 'legendary')
  const scoreNote = [...room.notices].reverse().find((notice) => notice.kind === 'score' && (notice.targetId === me.id || notice.targetId === null))
  const freshFlash = flash && now - flashAt < 1600 ? flash : null
  const prompt = prompts(me, room)

  return (
    <div className="pointer-events-none absolute inset-0 p-4 text-cream">
      <div className="flex items-start justify-between gap-3">
        <section className="w-60 rounded-3xl bg-panel/85 p-4 shadow-xl">
          <div className="mb-2 flex items-center justify-between text-sm font-bold tracking-wide text-gold">
            <span>MA LISTE</span>
            <span aria-hidden>🗒️</span>
          </div>
          <ul className="space-y-1 text-lg">
            {rows.map((row, index) => (
              <li key={`${row.type}-${index}`} className={row.status === 'done' ? 'text-mint' : row.status === 'cart' ? 'text-gold' : 'text-cream/80'}>
                <span className="mr-2">{row.status === 'done' ? '✓' : row.status === 'cart' ? '▣' : '☐'}</span>
                {row.name}
              </li>
            ))}
          </ul>
        </section>
        <div className="text-center">
          <div className={`text-6xl font-bold tabular-nums ${left < 30_000 && room.phase === 'playing' ? 'text-coral' : 'text-gold'}`}>
            {room.phase === 'countdown' ? Math.max(1, Math.ceil(left / 1000)) : formatClock(left)}
          </div>
          <div className="mt-1 inline-block rounded-full bg-panel/85 px-4 py-1 text-sm font-bold">MANCHE {room.round}</div>
        </div>
        <section className="w-48 rounded-3xl bg-panel/85 p-4 text-right shadow-xl">
          <div className="text-xs font-bold tracking-[0.2em] text-cream/70">SCORE</div>
          <div className="text-5xl font-bold leading-none">{me.score}</div>
          <div className="mt-1 text-sm text-cream/80">
            {me.validatedItems} article{me.validatedItems > 1 ? 's' : ''} validé{me.validatedItems > 1 ? 's' : ''}
          </div>
        </section>
      </div>

      {room.phase === 'countdown' && (
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 text-center text-7xl font-bold text-gold drop-shadow">
          {Math.max(1, Math.ceil(left / 1000))}
        </div>
      )}

      {steal && (
        <div className="absolute left-1/2 top-1/2 w-[min(640px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e15a4a] px-6 py-3 text-center text-xl font-bold text-white shadow-2xl">
          ⚠ {steal.text}
        </div>
      )}
      {!steal && legendary && (
        <div className="absolute left-1/2 top-[42%] -translate-x-1/2 rounded-full bg-gold px-6 py-3 text-center text-xl font-bold text-ink shadow-xl">
          {legendary.text}
        </div>
      )}
      {(freshFlash || scoreNote) && !steal && (
        <div className="absolute left-1/2 top-[58%] -translate-x-1/2 rounded-full bg-ink/80 px-4 py-2 text-sm font-bold">
          {freshFlash ?? scoreNote?.text}
        </div>
      )}
      {me.stealing > 0 && (
        <div className="absolute bottom-28 left-1/2 w-48 -translate-x-1/2">
          <div className="mb-1 text-center text-xs font-bold">VOL…</div>
          <div className="h-2 overflow-hidden rounded-full bg-black/40">
            <div className="h-full bg-coral" style={{ width: `${me.stealing * 100}%` }} />
          </div>
        </div>
      )}

      <section className="absolute bottom-4 left-4 rounded-2xl bg-panel/85 px-4 py-3 text-sm shadow-xl">
        <div>E · {prompt.e}</div>
        <div>F · {prompt.f}</div>
        <div className="mt-1 text-cream/70">ZQSD, WASD ou flèches · Shift sprinter · Espace sauter</div>
      </section>
      <section className="absolute bottom-4 right-4 w-52 rounded-2xl bg-panel/85 px-4 py-3 shadow-xl">
        <div className="flex items-center justify-between text-sm font-bold">
          <span>CADDIE {count}/{CART_CAPACITY}</span>
          <span aria-hidden>🛒</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/30">
          <div className="h-full rounded-full bg-gold" style={{ width: `${(count / CART_CAPACITY) * 100}%` }} />
        </div>
      </section>
      {!document.pointerLockElement && room.phase === 'playing' && !paused && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-ink/70 px-4 py-2 text-sm">
          Clique pour tourner la caméra
        </div>
      )}
      {paused && <Pause />}
    </div>
  )
}

function prompts(
  me: { id: string; x: number; z: number; holdingCart: boolean; carryingId: string | null },
  room: NonNullable<ReturnType<typeof useGame.getState>['room']>,
) {
  const release = me.holdingCart ? 'Lâcher le caddie' : 'Pousser le caddie'
  const cart = room.carts.find((item) => item.ownerId === me.id)
  const zone = cart ? checkoutReady(me.x, me.z, cart.x, cart.z) : null
  if (zone && ((cart?.itemIds.length ?? 0) > 0 || me.carryingId)) return { e: 'Passer en caisse', f: release }
  if (me.carryingId && cart && Math.hypot(me.x - cart.x, me.z - cart.z) <= INTERACT_RANGE + 0.4) {
    return { e: 'Déposer dans le caddie', f: release }
  }
  if (me.carryingId) return { e: 'Lâcher', f: release }
  for (const product of room.products) {
    if ((product.state === 'shelf' || product.state === 'ground') && Math.hypot(me.x - product.x, me.z - product.z) <= INTERACT_RANGE) {
      return { e: 'Ramasser', f: release }
    }
  }
  for (const other of room.carts) {
    if (other.ownerId !== me.id && other.itemIds.length > 0 && Math.hypot(me.x - other.x, me.z - other.z) <= STEAL_RANGE) {
      return { e: 'Voler (maintenir)', f: release }
    }
  }
  return { e: 'Ramasser', f: release }
}

function Pause() {
  const setPaused = useGame((state) => state.setPaused)
  return (
    <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-ink/55">
      <div className="w-80 rounded-3xl bg-panel p-6 text-center shadow-2xl">
        <h2 className="text-3xl font-bold">Pause</h2>
        <p className="mt-2 text-sm text-cream/80">La manche continue pour les autres.</p>
        <button className="arcade-btn mt-5 w-full bg-gold px-4 py-3 text-ink" onClick={() => setPaused(false)}>
          Reprendre
        </button>
        <button className="arcade-btn mt-3 w-full bg-white/10 px-4 py-3" onClick={() => void sendLeave()}>
          Quitter le salon
        </button>
      </div>
    </div>
  )
}

function Results() {
  const room = useGame((state) => state.room)
  const playerId = useGame((state) => state.playerId)
  if (!room || !playerId) return null
  const ranked = [...room.players].sort((a, b) => b.score - a.score || b.validatedItems - a.validatedItems)
  const best = ranked[0]?.score ?? 0
  const tied = ranked.filter((player) => player.score === best)
  const me = ranked.find((player) => player.id === playerId)
  const title = tied.some((player) => player.id === playerId) ? (tied.length > 1 ? 'ÉGALITÉ' : 'VICTOIRE') : 'DÉFAITE'
  const hostOnline = room.players.some((player) => player.host && player.connected)
  const canRestart = Boolean(me && (!hostOnline || me.host))
  return (
    <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-ink/55 p-4">
      <div className="w-[min(760px,96vw)] rounded-[2rem] bg-[#204554] p-6 shadow-2xl">
        <div className="text-center">
          <div className="text-sm tracking-[0.25em] text-gold">MANCHE {room.round}</div>
          <h2 className="text-5xl font-bold text-gold">{title}</h2>
        </div>
        <div className="mt-4 flex items-end justify-center gap-3">
          {ranked.slice(0, 3).map((player, index) => (
            <div key={player.id} className="text-center">
              <div className="mb-1 text-sm font-bold">{player.name}</div>
              <div
                className="grid w-24 place-items-end rounded-t-2xl px-2 pb-2 text-2xl font-bold text-ink"
                style={{ height: 90 + (2 - index) * 28, background: index === 0 ? '#ffd56a' : index === 1 ? '#d7fff1' : '#ffb4c0' }}
              >
                {player.score}
              </div>
            </div>
          ))}
        </div>
        <ul className="mt-4 space-y-2">
          {ranked.map((player, index) => (
            <li key={player.id} className="flex items-center justify-between rounded-2xl bg-black/20 px-3 py-2">
              <span>
                {index + 1}. {player.name}
                {!player.connected ? ' (parti)' : ''}
              </span>
              <span className="text-sm text-cream/80">
                {player.score} pts · {player.validatedItems} validés · {player.stolen} volés · {player.shoves} bousculades
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex justify-center gap-3">
          {canRestart ? (
            <button className="arcade-btn bg-coral px-5 py-3 text-white" onClick={() => void sendRematch()}>
              Rejouer
            </button>
          ) : (
            <div className="rounded-2xl bg-black/20 px-4 py-3 text-sm">L’hôte peut relancer la manche.</div>
          )}
          <button className="arcade-btn bg-white/10 px-5 py-3" onClick={() => void sendLeave()}>
            Quitter
          </button>
        </div>
      </div>
    </div>
  )
}
