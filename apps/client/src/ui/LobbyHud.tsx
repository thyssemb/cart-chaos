import { ACCESSORIES, COLORS, FACES, lobbySpotAt, type LobbySpotId } from '@cart-chaos/shared'
import { useEffect, useRef, useState } from 'react'
import { playUi } from '../audio'
import { sendChat, sendLeave, sendLook } from '../net'
import { AvatarPreview } from '../scene/AvatarPreview'
import { useGame } from '../store'
import { lobbyUi, patchLobbyUi, views, watchLobbyUi } from '../views'

export function LobbyHud() {
  const room = useGame((state) => state.room)
  const playerId = useGame((state) => state.playerId)
  const error = useGame((state) => state.error)
  const flash = useGame((state) => state.flash)
  const flashAt = useGame((state) => state.flashAt)
  const clockOffset = useGame((state) => state.clockOffset)
  const setScreen = useGame((state) => state.setScreen)
  const [ui, setUi] = useState({ kiosk: lobbyUi.kiosk, chat: lobbyUi.chat })
  const [draft, setDraft] = useState('')
  const [spot, setSpot] = useState<LobbySpotId | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const inputRef = useRef<HTMLInputElement>(null)
  const copied = useRef(lobbyUi.copy)
  const countTick = useRef<number | null>(null)

  useEffect(() => watchLobbyUi(() => setUi({ kiosk: lobbyUi.kiosk, chat: lobbyUi.chat })), [])
  useEffect(() => {
    return watchLobbyUi(() => {
      if (lobbyUi.copy === copied.current) return
      copied.current = lobbyUi.copy
      const code = useGame.getState().room?.code
      if (!code) return
      void navigator.clipboard?.writeText(code).then(
        () => useGame.getState().setFlash('Code copié'),
        () => useGame.getState().setFlash(code),
      )
    })
  }, [])
  useEffect(() => {
    if (ui.chat) inputRef.current?.focus()
  }, [ui.chat])
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    let frame = 0
    const tick = () => {
      const id = useGame.getState().playerId
      const pose = id ? views.players.get(id) : undefined
      const next = lobbySpotAt(pose?.x ?? views.local.x, pose?.z ?? views.local.z)
      setSpot((prev) => (prev === next ? prev : next))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])
  useEffect(() => {
    if (!room || room.phase !== 'countdown') {
      countTick.current = null
      return
    }
    const sec = Math.max(1, Math.ceil(Math.max(0, room.endsAt - (Date.now() + clockOffset)) / 1000))
    if (countTick.current !== null && countTick.current !== sec) playUi('count')
    countTick.current = sec
  }, [room, clockOffset, now])

  if (!room || !playerId) return null
  const me = room.players.find((player) => player.id === playerId)
  if (!me) return null
  const fresh = flash && now - flashAt < 1800 ? flash : null
  const left = room.phase === 'countdown' ? Math.max(0, room.endsAt - (now + clockOffset)) : 0
  const prompt = promptFor(spot, me, room)

  const send = () => {
    const text = draft.trim()
    if (!text) {
      patchLobbyUi({ chat: false })
      return
    }
    void sendChat(text).then((ok) => {
      if (!ok) return
      setDraft('')
      patchLobbyUi({ chat: false })
    })
  }

  return (
    <div className="pointer-events-none absolute inset-0 text-cream">
      <div className="absolute left-4 top-4 rounded-2xl bg-ink/70 px-4 py-2 shadow-xl">
        <div className="text-[10px] tracking-[0.25em] text-gold">PLACE</div>
        <div className="text-2xl font-bold tracking-widest">{room.code}</div>
      </div>
      <div className="absolute right-4 top-4 flex gap-2">
        <button className="arcade-btn pointer-events-auto bg-white/15 px-4 py-2" onMouseDown={(event) => event.preventDefault()} onClick={() => setScreen('settings')}>
          Paramètres
        </button>
        <button
          className="arcade-btn pointer-events-auto bg-white/15 px-4 py-2"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            playUi('click')
            void sendLeave()
          }}
        >
          Quitter
        </button>
      </div>
      <div className="absolute bottom-4 left-4 max-w-sm rounded-2xl bg-ink/65 px-4 py-3 text-sm shadow-xl">
        <div>ZQSD, WASD ou flèches · Shift sprinter · Espace sauter</div>
        <div className="text-cream/75">E interagir · 1 saluer · 2 danser · Entrée pour parler</div>
      </div>
      {prompt && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-ink/75 px-4 py-2 text-sm font-bold">{prompt}</div>
      )}
      {!document.pointerLockElement && !ui.kiosk && !ui.chat && room.phase === 'lobby' && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 rounded-full bg-ink/60 px-4 py-2 text-sm">Clique pour tourner la caméra</div>
      )}
      {(fresh || error) && (
        <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full bg-ink/80 px-4 py-2 text-sm font-bold text-gold">{fresh || error}</div>
      )}
      {room.phase === 'countdown' && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-8xl font-bold text-gold drop-shadow">{Math.max(1, Math.ceil(left / 1000))}</div>
            <div className="mt-2 text-xl font-bold">Le supermarché ouvre</div>
          </div>
        </div>
      )}
      {ui.chat && (
        <form
          className="pointer-events-auto absolute bottom-4 left-1/2 flex w-[min(420px,92vw)] -translate-x-1/2 gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
        >
          <input
            ref={inputRef}
            className="w-full rounded-2xl bg-ink/85 px-4 py-3 outline-none"
            maxLength={80}
            placeholder="Message"
            value={draft}
            autoComplete="off"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                setDraft('')
                patchLobbyUi({ chat: false })
              }
            }}
            onBlur={() => {
              window.setTimeout(() => {
                if (document.activeElement !== inputRef.current) patchLobbyUi({ chat: false })
              }, 120)
            }}
          />
        </form>
      )}
      {ui.kiosk && <Kiosk onClose={() => patchLobbyUi({ kiosk: false })} />}
    </div>
  )
}

function promptFor(
  spot: LobbySpotId | null,
  me: { host: boolean; ready: boolean },
  room: NonNullable<ReturnType<typeof useGame.getState>['room']>,
) {
  if (room.phase !== 'lobby' || !spot) return null
  if (spot === 'ready') return me.ready ? 'E · Pas prêt' : 'E · Prêt · Manche 3 min'
  if (spot === 'kiosk') return 'E · Personnaliser'
  if (spot === 'code') return 'E · Copier le code'
  if (spot === 'vend') return 'E · Distributeur'
  if (spot === 'hoop') return 'E · Panier'
  const online = room.players.filter((player) => player.connected)
  const hostOnline = online.some((player) => player.host)
  if (hostOnline && !me.host) return 'L’hôte ouvre le magasin'
  if (!online.every((player) => player.ready)) return 'Tout le monde doit être prêt'
  return 'E · Lancer la manche'
}

function Kiosk({ onClose }: { onClose: () => void }) {
  const settings = useGame((state) => state.settings)
  const setSettings = useGame((state) => state.setSettings)
  const wear = (patch: Parameters<typeof setSettings>[0]) => {
    const previous = useGame.getState().settings
    setSettings(patch)
    void sendLook().then((ok) => {
      if (!ok) setSettings({ colorId: previous.colorId, faceId: previous.faceId, accessory: previous.accessory })
    })
  }
  return (
    <div className="pointer-events-auto absolute inset-y-0 right-0 flex w-[min(420px,96vw)] items-center p-4">
      <div className="max-h-full w-full overflow-auto rounded-[1.5rem] bg-ink/88 p-4 shadow-2xl">
        <div className="h-40 overflow-hidden rounded-2xl bg-[#1d4a55]">
          <AvatarPreview colorId={settings.colorId} faceId={settings.faceId} accessory={settings.accessory} name={settings.name} />
        </div>
        <h2 className="mt-3 text-2xl font-bold">Ton avatar</h2>
        <div className="mt-3 text-sm font-bold">Couleur</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {COLORS.map((color) => (
            <button
              key={color.id}
              className="rounded-full px-3 py-1 text-sm font-bold text-ink"
              style={{ background: color.hex, outline: settings.colorId === color.id ? '3px solid white' : 'none' }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => wear({ colorId: color.id })}
            >
              {color.label}
            </button>
          ))}
        </div>
        <div className="mt-3 text-sm font-bold">Visage</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {FACES.map((face) => (
            <button
              key={face.id}
              className={`arcade-btn px-3 py-2 text-sm ${settings.faceId === face.id ? 'bg-gold text-ink' : 'bg-white/10'}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => wear({ faceId: face.id })}
            >
              {face.label}
            </button>
          ))}
        </div>
        <div className="mt-3 text-sm font-bold">Accessoire</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {ACCESSORIES.map((item) => (
            <button
              key={item.id}
              className={`arcade-btn px-3 py-2 text-sm ${settings.accessory === item.id ? 'bg-gold text-ink' : 'bg-white/10'}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => wear({ accessory: item.id })}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button className="arcade-btn mt-4 bg-gold px-4 py-2 text-ink" onMouseDown={(event) => event.preventDefault()} onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  )
}
