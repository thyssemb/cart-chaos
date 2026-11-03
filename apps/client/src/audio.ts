import type { SfxType } from '@cart-chaos/shared'
import { useGame } from './store'

type MusicMode = 'menu' | 'match' | 'results'

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let musicGain: GainNode | null = null
let sfxGain: GainNode | null = null
let wheelGain: GainNode | null = null
let humGain: GainNode | null = null
let hissGain: GainNode | null = null
let started = false
let timer = 0
let ambienceTimer = 0
let mode: MusicMode = 'menu'
let lastSqueak = 0
const listener = { x: 0, z: 0, yaw: 0 }

const MENU = [262, 330, 392, 494, 392, 330, 349, 440, 523, 440, 349, 330]
const MATCH = [220, 262, 294, 330, 294, 262, 247, 294, 330, 392, 330, 294]

function context() {
  if (!ctx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    ctx = new Ctx()
    masterGain = ctx.createGain()
    musicGain = ctx.createGain()
    sfxGain = ctx.createGain()
    masterGain.connect(ctx.destination)
    musicGain.connect(masterGain)
    sfxGain.connect(masterGain)

    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
    const wheels = ctx.createBufferSource()
    wheels.buffer = noise
    wheels.loop = true
    const wheelFilter = ctx.createBiquadFilter()
    wheelFilter.type = 'bandpass'
    wheelFilter.frequency.value = 220
    wheelFilter.Q.value = 0.8
    wheelGain = ctx.createGain()
    wheelGain.gain.value = 0
    wheels.connect(wheelFilter)
    wheelFilter.connect(wheelGain)
    wheelGain.connect(sfxGain)
    wheels.start()

    const hum = ctx.createOscillator()
    hum.type = 'sine'
    hum.frequency.value = 68
    humGain = ctx.createGain()
    humGain.gain.value = 0
    hum.connect(humGain)
    humGain.connect(musicGain)
    hum.start()

    const hiss = ctx.createBufferSource()
    hiss.buffer = noise
    hiss.loop = true
    const hissFilter = ctx.createBiquadFilter()
    hissFilter.type = 'lowpass'
    hissFilter.frequency.value = 240
    hissGain = ctx.createGain()
    hissGain.gain.value = 0
    hiss.connect(hissFilter)
    hissFilter.connect(hissGain)
    hissGain.connect(musicGain)
    hiss.start()

    document.addEventListener('visibilitychange', () => {
      if (!ctx) return
      if (document.hidden) void ctx.suspend()
      else if (started) void ctx.resume()
    })
  }
  return ctx
}

export function ensureAudio() {
  const audio = context()
  if (!audio) return
  if (audio.state === 'suspended') void audio.resume()
  syncAudio()
  if (!started) {
    started = true
    scheduleMusic()
    scheduleAmbience()
  }
}

export function syncAudio() {
  if (!ctx || !masterGain || !musicGain || !sfxGain || !humGain || !hissGain) return
  const { master, music, sfx } = useGame.getState().settings
  masterGain.gain.value = master
  musicGain.gain.value = music * 0.16
  sfxGain.gain.value = sfx
  humGain.gain.value = mode === 'match' ? 0.04 : 0
  hissGain.gain.value = mode === 'match' ? 0.02 : 0
}

export function setMusicMode(next: MusicMode) {
  if (mode === next) return
  mode = next
  syncAudio()
  if (!started) return
  window.clearTimeout(timer)
  scheduleMusic()
}

export function setListener(x: number, z: number, yaw: number) {
  listener.x = x
  listener.z = z
  listener.yaw = yaw
}

export function setWheel(amount: number) {
  const audio = context()
  if (!wheelGain || !audio) return
  const now = audio.currentTime
  wheelGain.gain.cancelScheduledValues(now)
  wheelGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(0.16, amount)), now + 0.05)
  if (amount > 0.07 && now - lastSqueak > 1.6) {
    lastSqueak = now
    tone(180 + Math.random() * 40, 0.08, 'sawtooth', 0.035)
  }
}

function scheduleMusic() {
  if (!ctx || !musicGain || !started) return
  const notes = mode === 'match' ? MATCH : MENU
  const step = mode === 'match' ? 0.42 : 0.3
  const when = ctx.currentTime + 0.05
  notes.forEach((freq, index) => {
    const osc = ctx!.createOscillator()
    const gain = ctx!.createGain()
    osc.type = index % 2 === 0 ? 'triangle' : 'sine'
    osc.frequency.value = freq
    const start = when + index * step
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(mode === 'results' ? 0.28 : 0.2, start + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + step * 0.92)
    osc.connect(gain)
    gain.connect(musicGain!)
    osc.start(start)
    osc.stop(start + step)
  })
  if (mode === 'results') return
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    if (started) scheduleMusic()
  }, step * notes.length * 1000 - 30)
}

function scheduleAmbience() {
  window.clearTimeout(ambienceTimer)
  ambienceTimer = window.setTimeout(() => {
    if (started && mode === 'match' && Math.random() < 0.65) {
      tone(880, 0.05, 'square', 0.025)
      tone(660, 0.07, 'square', 0.02, 0.08)
    }
    if (started) scheduleAmbience()
  }, 7000 + Math.random() * 6000)
}

function output(node: AudioNode, at?: { x: number; z: number }, loud = 1) {
  const audio = context()
  if (!audio || !sfxGain) return
  const loudness = audio.createGain()
  if (!at) {
    loudness.gain.value = loud
    node.connect(loudness)
    loudness.connect(sfxGain)
    return
  }
  const dx = at.x - listener.x
  const dz = at.z - listener.z
  const dist = Math.hypot(dx, dz) || 0.001
  const right = dx * Math.cos(listener.yaw) + dz * -Math.sin(listener.yaw)
  const panner = audio.createStereoPanner()
  panner.pan.value = Math.max(-1, Math.min(1, right / Math.max(2.2, dist)))
  loudness.gain.value = loud * Math.max(0.18, Math.min(1, 1.2 - dist / 16))
  node.connect(loudness)
  loudness.connect(panner)
  panner.connect(sfxGain)
}

function tone(freq: number, dur: number, type: OscillatorType, gainValue: number, delay = 0, at?: { x: number; z: number }) {
  const audio = context()
  if (!audio) return
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t = audio.currentTime + delay
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, gainValue), t + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain)
  output(gain, at)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function noiseBurst(dur: number, freq: number, gainValue: number, at?: { x: number; z: number }) {
  const audio = context()
  if (!audio) return
  const length = Math.max(1, Math.floor(audio.sampleRate * dur))
  const buffer = audio.createBuffer(1, length, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
  const source = audio.createBufferSource()
  source.buffer = buffer
  const filter = audio.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  filter.Q.value = 0.7
  const gain = audio.createGain()
  const t = audio.currentTime
  gain.gain.setValueAtTime(gainValue, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  source.connect(filter)
  filter.connect(gain)
  output(gain, at)
  source.start(t)
  source.stop(t + dur + 0.02)
}

export function footstep(speed: number) {
  try {
    ensureAudio()
    const run = speed > 5.6
    noiseBurst(0.045, run ? 280 : 180, run ? 0.09 : 0.055)
    tone(run ? 140 : 110, 0.04, 'triangle', run ? 0.04 : 0.025)
  } catch {
    // Le jeu continue si le son est bloqué.
  }
}

export function playUi(kind: 'hover' | 'click' | 'error' | 'count' | 'start') {
  try {
    ensureAudio()
    if (kind === 'hover') tone(720, 0.04, 'sine', 0.03)
    if (kind === 'click') tone(520, 0.07, 'triangle', 0.06)
    if (kind === 'error') tone(180, 0.16, 'square', 0.07)
    if (kind === 'count') tone(660, 0.09, 'square', 0.07)
    if (kind === 'start') {
      tone(523, 0.1, 'triangle', 0.08)
      tone(784, 0.14, 'triangle', 0.08, 0.08)
    }
  } catch {
    // Le jeu continue si le son est bloqué.
  }
}

export function playSfx(type: SfxType, at?: { x: number; z: number }) {
  try {
    ensureAudio()
    if (type === 'pickup') {
      tone(640, 0.09, 'square', 0.09, 0, at)
      tone(880, 0.08, 'triangle', 0.05, 0.05, at)
    }
    if (type === 'drop') noiseBurst(0.08, 240, 0.08, at)
    if (type === 'shove') {
      noiseBurst(0.12, 140, 0.12, at)
      tone(150, 0.14, 'sawtooth', 0.07, 0, at)
    }
    if (type === 'steal') {
      tone(520, 0.08, 'square', 0.08, 0, at)
      tone(340, 0.12, 'square', 0.08, 0.07, at)
      tone(190, 0.16, 'triangle', 0.08, 0.14, at)
    }
    if (type === 'checkout') {
      ;[523, 659, 784, 1046].forEach((freq, index) => tone(freq, 0.1, 'square', 0.07, index * 0.06, at))
    }
    if (type === 'legendary') {
      ;[392, 523, 659, 784, 1046].forEach((freq, index) => tone(freq, 0.16, 'triangle', 0.08, index * 0.07, at))
    }
    if (type === 'bump') {
      noiseBurst(0.1, 120, 0.1, at)
      tone(90, 0.12, 'sine', 0.05, 0, at)
    }
    if (type === 'complete') {
      ;[523, 659, 784, 1046].forEach((freq, index) => tone(freq, 0.14, 'triangle', 0.09, index * 0.07, at))
    }
    if (type === 'join') tone(480, 0.07, 'sine', 0.05, 0, at)
  } catch {
    // Le jeu continue si le son est bloqué.
  }
}

export function playVictory() {
  setMusicMode('results')
  playSfx('complete')
}

export function playEnd() {
  setMusicMode('results')
  tone(220, 0.22, 'sawtooth', 0.08)
  tone(146, 0.3, 'triangle', 0.07, 0.16)
}
