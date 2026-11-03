import { ACCESSORIES, COLORS, FACES, MAX_PLAYERS, MIN_PLAYERS, playerName } from '@cart-chaos/shared'
import { useEffect, useRef, useState } from 'react'
import { playUi, syncAudio } from '../audio'
import { createRoom, joinRoom, sendChat, sendLeave, sendLook, sendReady, sendStart } from '../net'
import { AvatarPreview } from '../scene/AvatarPreview'
import { useGame } from '../store'

export function Menu() {
  const [mode, setMode] = useState<'home' | 'play'>('home')
  const [code, setCode] = useState('')
  const settings = useGame((state) => state.settings)
  const setSettings = useGame((state) => state.setSettings)
  const setScreen = useGame((state) => state.setScreen)
  const error = useGame((state) => state.error)
  const connected = useGame((state) => state.connected)

  const openPlay = () => {
    playUi('click')
    if (!playerName(settings.name).ok) {
      setScreen('customize')
      return
    }
    setMode('play')
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 md:justify-start md:pl-8 lg:pl-14">
      <div className="panel-in w-[min(440px,94vw)] rounded-[2rem] bg-ink/75 p-6 text-center shadow-2xl backdrop-blur-sm sm:p-8">
        <div className="text-sm font-bold tracking-[0.35em] text-gold">PARTY GAME</div>
        <h1 className="mt-1 text-5xl font-bold leading-none text-cream sm:text-6xl">CART CHAOS</h1>
        <p className="mt-2 text-lg text-cream/80">Grab it. Steal it. Checkout.</p>
        {mode === 'home' ? (
          <div className="mt-8 space-y-3">
            <button className="arcade-btn w-full bg-coral px-4 py-3 text-xl text-white" onMouseEnter={() => playUi('hover')} onClick={openPlay}>
              Jouer
            </button>
            <button className="arcade-btn w-full bg-[#2ec4b6] px-4 py-3 text-xl text-ink" onMouseEnter={() => playUi('hover')} onClick={() => { playUi('click'); setScreen('customize') }}>
              Personnaliser
            </button>
            <button className="arcade-btn w-full bg-white/10 px-4 py-3 text-xl" onMouseEnter={() => playUi('hover')} onClick={() => { playUi('click'); setScreen('settings') }}>
              Paramètres
            </button>
            <button className="text-sm text-cream/70 underline-offset-2 hover:underline" onMouseEnter={() => playUi('hover')} onClick={() => { playUi('click'); setScreen('howto') }}>
              Comment jouer
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-3 text-left">
            <label className="block text-sm">
              Pseudo
              <input
                className="mt-1 w-full rounded-2xl bg-white/10 px-4 py-3 outline-none"
                maxLength={16}
                value={settings.name}
                onChange={(event) => setSettings({ name: event.target.value })}
              />
            </label>
            <button className="arcade-btn w-full bg-coral px-4 py-3 text-white" onMouseEnter={() => playUi('hover')} onClick={() => { playUi('click'); void createRoom() }}>
              Créer une partie
            </button>
            <div className="flex gap-2">
              <input
                className="w-full rounded-2xl bg-white/10 px-4 py-3 uppercase outline-none"
                maxLength={4}
                placeholder="CODE"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
              />
              <button className="arcade-btn bg-gold px-4 py-3 text-ink" onMouseEnter={() => playUi('hover')} onClick={() => { playUi('click'); void joinRoom(code) }}>
                Rejoindre
              </button>
            </div>
            <button className="w-full text-sm text-cream/70" onClick={() => setMode('home')}>
              Retour
            </button>
          </div>
        )}
        {error && <p className="mt-4 rounded-2xl bg-coral/80 px-3 py-2 text-sm">{error}</p>}
        <p className="mt-4 text-xs text-cream/60">{connected ? 'Serveur connecté' : 'Connexion au serveur…'}</p>
      </div>
    </div>
  )
}

export function Customize() {
  const settings = useGame((state) => state.settings)
  const setSettings = useGame((state) => state.setSettings)
  const setScreen = useGame((state) => state.setScreen)
  const named = playerName(settings.name)
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4">
      <div className="panel-in grid w-[min(860px,96vw)] gap-4 rounded-[2rem] bg-ink/80 p-4 shadow-2xl md:grid-cols-[280px_1fr] md:p-6">
        <div className="h-72 overflow-hidden rounded-[1.5rem] bg-[#1d4a55] md:h-full md:min-h-80">
          <AvatarPreview colorId={settings.colorId} faceId={settings.faceId} accessory={settings.accessory} name={settings.name} />
        </div>
        <div>
          <h2 className="text-4xl font-bold">Ton avatar</h2>
          <p className="mt-1 text-sm text-cream/70">Pseudo, couleur, visage et accessoire. Enregistré sur cet appareil.</p>
          <label className="mt-4 block text-sm">
            Pseudo (3 à 16 caractères)
            <input
              className="mt-1 w-full rounded-2xl bg-white/10 px-4 py-3 outline-none"
              maxLength={16}
              value={settings.name}
              onChange={(event) => setSettings({ name: event.target.value })}
            />
          </label>
          {!named.ok && settings.name.trim().length > 0 && <p className="mt-1 text-sm text-coral">{named.error}</p>}
          <div className="mt-4 text-sm font-bold">Couleur</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {COLORS.map((color) => (
              <button
                key={color.id}
                className="rounded-full px-3 py-1 text-sm font-bold text-ink"
                style={{ background: color.hex, outline: settings.colorId === color.id ? '3px solid white' : 'none' }}
                onMouseEnter={() => playUi('hover')}
                onClick={() => { playUi('click'); setSettings({ colorId: color.id }) }}
              >
                {color.label}
              </button>
            ))}
          </div>
          <div className="mt-4 text-sm font-bold">Visage</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {FACES.map((face) => (
              <button
                key={face.id}
                className={`arcade-btn px-3 py-2 text-sm ${settings.faceId === face.id ? 'bg-gold text-ink' : 'bg-white/10'}`}
                onMouseEnter={() => playUi('hover')}
                onClick={() => { playUi('click'); setSettings({ faceId: face.id }) }}
              >
                {face.label}
              </button>
            ))}
          </div>
          <div className="mt-4 text-sm font-bold">Accessoire</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {ACCESSORIES.map((item) => (
              <button
                key={item.id}
                className={`arcade-btn px-3 py-2 text-sm ${settings.accessory === item.id ? 'bg-gold text-ink' : 'bg-white/10'}`}
                onMouseEnter={() => playUi('hover')}
                onClick={() => { playUi('click'); setSettings({ accessory: item.id }) }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            className="arcade-btn mt-6 bg-gold px-5 py-3 text-ink disabled:opacity-50"
            disabled={!named.ok}
            onClick={() => { playUi('click'); setScreen('menu') }}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

export function HowTo() {
  const setScreen = useGame((state) => state.setScreen)
  return (
    <div className="absolute inset-0 grid place-items-center p-6">
      <div className="w-[min(560px,94vw)] rounded-[2rem] bg-ink/80 p-7">
        <h2 className="text-4xl font-bold">Comment jouer</h2>
        <ul className="mt-4 space-y-2 text-lg leading-snug">
          <li>ZQSD, WASD ou les flèches se déplacent par rapport à la caméra. Shift sprinte, Espace saute.</li>
          <li>La souris tourne la caméra après un clic. Échap met en pause locale.</li>
          <li>F saisit ou lâche ton caddie. E ramasse, dépose, vole ou passe en caisse.</li>
          <li>Le clic gauche bouscule. Un choc peut faire tomber un produit.</li>
          <li>Ta liste ne compte qu’une fois les articles passés en caisse.</li>
          <li>Maintiens E près d’un caddie adverse non protégé pour voler.</li>
          <li>À 1:30, le PQ doré apparaît en promo : 1000 points, un seul exemplaire.</li>
        </ul>
        <button className="arcade-btn mt-6 bg-gold px-5 py-3 text-ink" onClick={() => setScreen('menu')}>
          Retour
        </button>
      </div>
    </div>
  )
}

export function Settings() {
  const settings = useGame((state) => state.settings)
  const setSettings = useGame((state) => state.setSettings)
  const setScreen = useGame((state) => state.setScreen)
  const inLobby = useGame((state) => state.screen === 'settings' && state.room?.phase === 'lobby')
  return (
    <div className="absolute inset-0 grid place-items-center p-6">
      <div className="w-[min(440px,94vw)] rounded-[2rem] bg-ink/80 p-7">
        <h2 className="text-4xl font-bold">Réglages</h2>
        <label className="mt-4 block text-sm">
          Pseudo
          <input
            className="mt-1 w-full rounded-2xl bg-white/10 px-4 py-3 outline-none"
            maxLength={16}
            value={settings.name}
            onChange={(event) => setSettings({ name: event.target.value })}
          />
        </label>
        <label className="mt-4 block text-sm">
          Volume général {Math.round(settings.master * 100)}%
          <input
            className="mt-2 w-full"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={settings.master}
            onChange={(event) => {
              setSettings({ master: Number(event.target.value) })
              syncAudio()
            }}
          />
        </label>
        <label className="mt-4 block text-sm">
          Musique {Math.round(settings.music * 100)}%
          <input
            className="mt-2 w-full"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={settings.music}
            onChange={(event) => {
              setSettings({ music: Number(event.target.value) })
              syncAudio()
            }}
          />
        </label>
        <label className="mt-4 block text-sm">
          Effets {Math.round(settings.sfx * 100)}%
          <input
            className="mt-2 w-full"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={settings.sfx}
            onChange={(event) => {
              setSettings({ sfx: Number(event.target.value) })
              syncAudio()
            }}
          />
        </label>
        <label className="mt-4 block text-sm">
          Mouvements de caméra {Math.round(settings.camera * 100)}%
          <input
            className="mt-2 w-full"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={settings.camera}
            onChange={(event) => setSettings({ camera: Number(event.target.value) })}
          />
        </label>
        <button className="arcade-btn mt-6 bg-gold px-5 py-3 text-ink" onClick={() => setScreen(inLobby ? 'lobby' : 'menu')}>
          Retour
        </button>
      </div>
    </div>
  )
}

export function Lobby() {
  const room = useGame((state) => state.room)
  const playerId = useGame((state) => state.playerId)
  const error = useGame((state) => state.error)
  const flash = useGame((state) => state.flash)
  const setSettings = useGame((state) => state.setSettings)
  const setScreen = useGame((state) => state.setScreen)
  const [copied, setCopied] = useState(false)
  const [draft, setDraft] = useState('')
  const log = useRef<HTMLDivElement>(null)
  const chatCount = room?.chats.length ?? 0
  useEffect(() => {
    const node = log.current
    if (node) node.scrollTop = node.scrollHeight
  }, [chatCount])
  if (!room) return null
  const me = room.players.find((player) => player.id === playerId)
  const hostOnline = room.players.some((player) => player.host && player.connected)
  const online = room.players.filter((player) => player.connected)
  const allReady = online.every((player) => player.ready)
  const canStart = Boolean(me && (!hostOnline || me.host) && online.length >= MIN_PLAYERS && allReady)
  const wear = (patch: Parameters<typeof setSettings>[0]) => {
    const previous = useGame.getState().settings
    setSettings(patch)
    void sendLook().then((ok) => {
      if (!ok) setSettings({ colorId: previous.colorId, faceId: previous.faceId, accessory: previous.accessory })
    })
  }

  return (
    <div className="absolute inset-0 grid place-items-center overflow-auto p-3 sm:p-4">
      <div className="panel-in grid w-[min(920px,96vw)] gap-4 rounded-[2rem] bg-ink/80 p-4 shadow-2xl md:grid-cols-[1.2fr_0.8fr] md:p-6">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm tracking-[0.25em] text-gold">SALON PRIVÉ</div>
              <h2 className="text-4xl font-bold tracking-widest sm:text-5xl">{room.code}</h2>
            </div>
            <button
              className="arcade-btn bg-gold px-4 py-2 text-ink"
              onMouseEnter={() => playUi('hover')}
              onClick={() => {
                playUi('click')
                void navigator.clipboard?.writeText(room.code).then(() => setCopied(true)).catch(() => setCopied(false))
              }}
            >
              {copied ? 'Copié' : 'Copier le code'}
            </button>
          </div>
          <p className="mt-1 text-sm text-cream/70">
            {online.length}/{MAX_PLAYERS} en ligne · tout le monde doit être prêt
          </p>
          <ul className="mt-4 max-h-64 space-y-2 overflow-auto">
            {room.players.map((player) => {
              const color = COLORS.find((item) => item.id === player.colorId)
              const face = FACES.find((item) => item.id === player.faceId)
              const accessory = ACCESSORIES.find((item) => item.id === player.accessory)
              return (
                <li key={player.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white/10 px-3 py-2">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg font-bold text-ink" style={{ background: color?.hex }}>
                      {player.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold">
                        {player.name}
                        {player.host ? ' · hôte' : ''}
                        {!player.connected ? ' · parti' : ''}
                      </span>
                      <span className="block text-xs text-cream/70">
                        {face?.label} · {accessory?.label}
                      </span>
                    </span>
                  </span>
                  <span className={player.ready ? 'text-mint' : 'text-cream/60'}>{player.connected ? (player.ready ? 'Prêt' : 'Pas prêt') : 'Absent'}</span>
                </li>
              )
            })}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            {COLORS.map((color) => (
              <button
                key={color.id}
                className="h-8 w-8 rounded-full"
                aria-label={color.label}
                style={{ background: color.hex, outline: me?.colorId === color.id ? '3px solid white' : 'none' }}
                onClick={() => wear({ colorId: color.id })}
              />
            ))}
          </div>
          {(error || flash) && <p className="mt-3 text-sm text-gold">{error || flash}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="arcade-btn bg-white/10 px-4 py-3" onClick={() => { playUi('click'); void sendReady() }}>
              {me?.ready ? 'Pas prêt' : 'Prêt'}
            </button>
            <button className="arcade-btn bg-coral px-4 py-3 text-white disabled:opacity-50" disabled={!canStart} onClick={() => { playUi('click'); void sendStart() }}>
              Lancer la manche
            </button>
            <button className="arcade-btn bg-white/10 px-4 py-3" onClick={() => { playUi('click'); setScreen('settings') }}>
              Paramètres
            </button>
            <button className="arcade-btn bg-white/10 px-4 py-3" onClick={() => { playUi('click'); void sendLeave() }}>
              Quitter
            </button>
          </div>
        </div>
        <form
          className="flex min-h-64 flex-col rounded-[1.5rem] bg-black/20 p-3"
          onSubmit={(event) => {
            event.preventDefault()
            const text = draft.trim()
            if (!text) return
            void sendChat(text).then((ok) => {
              if (ok) setDraft('')
            })
          }}
        >
          <div className="text-sm font-bold tracking-wide text-gold">CHAT</div>
          <div ref={log} className="mt-2 flex-1 space-y-1 overflow-auto text-sm">
            {room.chats.length === 0 && <p className="text-cream/50">Dis bonjour avant le départ.</p>}
            {room.chats.map((chat) => (
              <p key={chat.id}>
                <span className="font-bold text-gold">{chat.name}</span> {chat.text}
              </p>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className="w-full rounded-2xl bg-white/10 px-3 py-2 outline-none"
              maxLength={80}
              placeholder="Message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button className="arcade-btn bg-gold px-3 py-2 text-ink" type="submit">
              Envoyer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
