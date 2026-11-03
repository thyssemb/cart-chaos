import { useEffect } from 'react'
import { ensureAudio, setMusicMode } from './audio'
import { GameCanvas, MenuCanvas } from './scene/GameCanvas'
import { useGame } from './store'
import { Hud } from './ui/Hud'
import { Customize, HowTo, Lobby, Menu, Settings } from './ui/Screens'

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
      <div className="absolute inset-0">{screen === 'game' ? <GameCanvas /> : <MenuCanvas />}</div>
      {screen === 'menu' && <Menu />}
      {screen === 'customize' && <Customize />}
      {screen === 'howto' && <HowTo />}
      {screen === 'settings' && <Settings />}
      {screen === 'lobby' && <Lobby />}
      {screen === 'game' && <Hud />}
    </main>
  )
}
