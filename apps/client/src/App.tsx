import { useEffect, useRef, useState } from 'react'
import { ensureAudio, setMusicMode } from './audio'
import { GameCanvas, MenuCanvas } from './scene/GameCanvas'
import { LobbyCanvas } from './scene/LobbyCanvas'
import { useGame } from './store'
import { Hud } from './ui/Hud'
import { LobbyHud } from './ui/LobbyHud'
import { Customize, HowTo, Menu, Settings } from './ui/Screens'

export function App() {
  const screen = useGame((state) => state.screen)
  const phase = useGame((state) => state.room?.phase)
  useEffect(() => {
    const start = () => ensureAudio()
    window.addEventListener('pointerdown', start, { once: true })
    return () => window.removeEventListener('pointerdown', start)
  }, [])
  useEffect(() => {
    if (screen !== 'game') setMusicMode('menu')
    else if (phase === 'results') setMusicMode('results')
    else setMusicMode('match')
  }, [screen, phase])

  return (
    <main className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        {screen === 'game' ? <GameCanvas /> : screen === 'lobby' ? <LobbyCanvas /> : <MenuCanvas />}
      </div>
      {screen === 'menu' && <Menu />}
      {screen === 'customize' && <Customize />}
      {screen === 'howto' && <HowTo />}
      {screen === 'settings' && <Settings />}
      {screen === 'lobby' && <LobbyHud />}
      {screen === 'game' && <Hud />}
      <MatchFade />
    </main>
  )
}

function MatchFade() {
  const phase = useGame((state) => state.room?.phase)
  const screen = useGame((state) => state.screen)
  const prevScreen = useRef(screen)
  const prevPhase = useRef(phase)
  const [visible, setVisible] = useState(false)
  const [opaque, setOpaque] = useState(true)
  useEffect(() => {
    const fromLobby = prevScreen.current === 'lobby' && prevPhase.current === 'countdown' && phase === 'playing'
    prevScreen.current = screen
    prevPhase.current = phase
    if (!fromLobby) return
    setVisible(true)
    setOpaque(true)
    const raf = requestAnimationFrame(() => setOpaque(false))
    const timer = window.setTimeout(() => setVisible(false), 720)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [phase, screen])
  if (!visible) return null
  return <div className="pointer-events-none absolute inset-0 z-30 bg-[#fff1dc]" style={{ opacity: opaque ? 1 : 0, transition: 'opacity 680ms ease' }} />
}
