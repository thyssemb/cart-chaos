import { COLORS, MAX_PLAYERS, MIN_PLAYERS } from '@cart-chaos/shared'
import { useState } from 'react'
import { playUi, syncAudio } from '../audio'
import { createRoom, joinRoom, sendColor, sendLeave, sendReady, sendStart } from '../net'
import { useGame } from '../store'

export function Menu() {
  const [mode, setMode] = useState<'home' | 'play'>('home')
  const [code, setCode] = useState('')
  const settings = useGame((state) => state.settings)
  const setSettings = useGame((state) => state.setSettings)
  const setScreen = useGame((state) => state.setScreen)
  const error = useGame((state) => state.error)
  const connected = useGame((state) => state.connected)

  return (
    <div className="absolute inset-0 grid place-items-center p-6">
      <div className="w-[min(440px,94vw)] rounded-[2rem] bg-ink/75 p-8 text-center shadow-2xl backdrop-blur-sm">
        <div className="text-sm font-bold tracking-[0.35em] text-gold">PARTY GAME</div>
        <h1 className="mt-1 text-6xl font-bold leading-none text-cream">CART CHAOS</h1>
        <p className="mt-2 text-lg text-cream/80">Grab it. Steal it. Checkout.</p>
        {mode === 'home' ? (
          <div className="mt-8 space-y-3">
            <button className="arcade-btn w-full bg-coral px-4 py-3 text-xl text-white" onMouseEnter={() => playUi('hover')} onClick={() => { playUi('click'); setMode('play') }}>
              Jouer
            </button>
            <button className="arcade-btn w-full bg-[#2ec4b6] px-4 py-3 text-xl text-ink" onMouseEnter={() => playUi('hover')} onClick={() => { playUi('click'); setScreen('howto') }}>
              Comment jouer
            </button>
            <button className="arcade-btn w-full bg-white/10 px-4 py-3 text-xl" onMouseEnter={() => playUi('hover')} onClick={() => { playUi('click'); setScreen('settings') }}>
              Réglages
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-3 text-left">
            <label className="block text-sm">
              Pseudo
              <input
                className="mt-1 w-full rounded-2xl bg-white/10 px-4 py-3 outline-none"
                maxLength={14}
                value={settings.name}
                onChange={(event) => setSettings({ name: event.target.value })}
              />
            </label>
            <button className="arcade-btn w-full bg-coral px-4 py-3 text-white" onClick={() => void createRoom()}>
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
              <button className="arcade-btn bg-gold px-4 py-3 text-ink" onClick={() => void joinRoom(code)}>
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

export function HowTo() {
  const setScreen = useGame((state) => state.setScreen)
  return (
    <div className="absolute inset-0 grid place-items-center p-6">
      <div className="w-[min(560px,94vw)] rounded-[2rem] bg-ink/80 p-7">
        <h2 className="text-4xl font-bold">Comment jouer</h2>
        <ul className="mt-4 space-y-2 text-lg leading-snug">
          <li>ZQSD, WASD ou les flèches : avancer, tourner à gauche, tourner à droite, reculer. Shift sprinte, Espace saute.</li>
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
            maxLength={14}
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
  const [copied, setCopied] = useState(false)
  if (!room) return null
  const me = room.players.find((player) => player.id === playerId)
  const hostOnline = room.players.some((player) => player.host && player.connected)
  const connected = room.players.filter((player) => player.connected).length
  const canStart = Boolean(me && (!hostOnline || me.host) && connected >= MIN_PLAYERS)

  return (
    <div className="absolute inset-0 grid place-items-center p-4">
      <div className="w-[min(680px,96vw)] rounded-[2rem] bg-ink/80 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm tracking-[0.25em] text-gold">SALON</div>
            <h2 className="text-5xl font-bold tracking-widest">{room.code}</h2>
          </div>
          <button
            className="arcade-btn bg-gold px-4 py-2 text-ink"
            onClick={() => {
              void navigator.clipboard?.writeText(room.code).then(() => setCopied(true)).catch(() => setCopied(false))
            }}
          >
            {copied ? 'Copié' : 'Copier le code'}
          </button>
        </div>
        <p className="mt-1 text-sm text-cream/70">
          {connected}/{MAX_PLAYERS} joueurs · lance seul pour tester, ou partage le code pour jouer à plusieurs
        </p>
        <ul className="mt-4 space-y-2">
          {room.players.map((player) => {
            const color = COLORS.find((item) => item.id === player.colorId)
            return (
              <li key={player.id} className="flex items-center justify-between rounded-2xl bg-white/10 px-3 py-2">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 rounded-full" style={{ background: color?.hex }} />
                  {player.name}
                  {player.host ? ' · hôte' : ''}
                  {!player.connected ? ' · absent' : ''}
                </span>
                <span>{player.ready ? 'Prêt' : '…'}</span>
              </li>
            )
          })}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {COLORS.map((color) => (
            <button
              key={color.id}
              className="rounded-full px-3 py-1 text-sm font-bold text-ink"
              style={{ background: color.hex, outline: me?.colorId === color.id ? '3px solid white' : 'none' }}
              onClick={() => void sendColor(color.id)}
            >
              {color.label}
            </button>
          ))}
        </div>
        {(error || flash) && <p className="mt-3 text-sm text-gold">{error || flash}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="arcade-btn bg-white/10 px-4 py-3" onClick={() => void sendReady()}>
            {me?.ready ? 'Pas prêt' : 'Prêt'}
          </button>
          <button className="arcade-btn bg-coral px-4 py-3 text-white disabled:opacity-50" disabled={!canStart} onClick={() => void sendStart()}>
            Lancer la manche
          </button>
          <button className="arcade-btn bg-white/10 px-4 py-3" onClick={() => void sendLeave()}>
            Quitter
          </button>
        </div>
      </div>
    </div>
  )
}
