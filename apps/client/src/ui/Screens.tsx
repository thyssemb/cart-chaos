import { ACCESSORIES, COLORS, FACES, playerName } from '@cart-chaos/shared'
import { SENSITIVITY_MAX, SENSITIVITY_MIN } from '../scene/cameraRig'
import { useState } from 'react'
import { playUi, syncAudio } from '../audio'
import { createRoom, joinRoom } from '../net'
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
        <a
          className="mt-2 block text-[10px] leading-tight text-cream/45 underline-offset-2 hover:underline"
          href="https://sketchfab.com/3d-models/food-pack-195c0c0d23e14e4693c640b16734714c"
          target="_blank"
          rel="noreferrer"
        >
          Aliments : Food pack de Pasha, CC BY 4.0
        </a>
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
          <li>Après un clic, la souris tourne la caméra et regarde en haut et en bas. Échap met en pause locale.</li>
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
  const back = useGame((state) => {
    const phase = state.room?.phase
    if (phase === 'lobby' || phase === 'countdown') return 'lobby' as const
    if (state.room) return 'game' as const
    return 'menu' as const
  })
  return (
    <div className="absolute inset-0 grid place-items-center overflow-auto p-6">
      <div className="max-h-[92vh] w-[min(440px,94vw)] overflow-y-auto rounded-[2rem] bg-ink/80 p-7">
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
        <label className="mt-4 block text-sm">
          Sensibilité souris {Math.round(settings.sensitivity * 100)}%
          <input
            className="mt-2 w-full"
            type="range"
            min={SENSITIVITY_MIN}
            max={SENSITIVITY_MAX}
            step={0.05}
            value={settings.sensitivity}
            onChange={(event) => setSettings({ sensitivity: Number(event.target.value) })}
          />
        </label>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <input
            className="h-4 w-4 accent-gold"
            type="checkbox"
            checked={settings.invertY}
            onChange={(event) => setSettings({ invertY: event.target.checked })}
          />
          Inverser l'axe vertical
        </label>
        <button className="arcade-btn mt-6 bg-gold px-5 py-3 text-ink" onClick={() => setScreen(back)}>
          Retour
        </button>
      </div>
    </div>
  )
}
