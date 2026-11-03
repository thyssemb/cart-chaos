import type { SfxType } from '@cart-chaos/shared'
import { useGame } from './store'

let ctx: AudioContext | null = null
let musicGain: GainNode | null = null
let sfxGain: GainNode | null = null
let wheelGain: GainNode | null = null
let started = false
let timer = 0

function context() {
  if (!ctx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    ctx = new Ctx()
    musicGain = ctx.createGain()
    sfxGain = ctx.createGain()
    musicGain.connect(ctx.destination)
    sfxGain.connect(ctx.destination)
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
    const source = ctx.createBufferSource()
    source.buffer = noise
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 180
    filter.Q.value = 0.7
    wheelGain = ctx.createGain()
    wheelGain.gain.value = 0
    source.connect(filter)
    filter.connect(wheelGain)
    wheelGain.connect(sfxGain)
    source.start()
  }
  return ctx
}

export function ensureAudio() {
  const audio = context()
  if (!audio) return
  if (audio.state === 'suspended') void audio.resume()
  applyVolumes()
  if (!started) {
    started = true
    scheduleMusic()
  }
}

function applyVolumes() {
  if (!ctx || !musicGain || !sfxGain) return
  const { music, sfx } = useGame.getState().settings
  musicGain.gain.value = music * 0.18
  sfxGain.gain.value = sfx
}

export function setWheel(amount: number) {
  if (!wheelGain || !ctx) return
  const now = ctx.currentTime
  wheelGain.gain.cancelScheduledValues(now)
  wheelGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(0.18, amount)), now + 0.05)
}

function scheduleMusic() {
  if (!ctx || !musicGain) return
  const lead = [262, 294, 330, 392, 330, 294, 262, 330, 392, 494, 392, 330]
  const step = 0.32
  const when = ctx.currentTime + 0.05
  lead.forEach((freq, index) => {
    const osc = ctx!.createOscillator()
    const gain = ctx!.createGain()
    osc.type = index % 2 === 0 ? 'triangle' : 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, when + index * step)
    gain.gain.exponentialRampToValueAtTime(0.22, when + index * step + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + index * step + step * 0.9)
    osc.connect(gain)
    gain.connect(musicGain!)
    osc.start(when + index * step)
    osc.stop(when + index * step + step)
  })
  const loop = step * lead.length
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    if (started) scheduleMusic()
  }, loop * 1000 - 40)
}

function tone(freq: number, dur: number, type: OscillatorType, gainValue: number, delay = 0) {
  const audio = context()
  if (!audio || !sfxGain) return
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t = audio.currentTime + delay
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, gainValue), t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain)
  gain.connect(sfxGain)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

export function playSfx(type: SfxType) {
  try {
    ensureAudio()
    if (type === 'pickup') tone(620, 0.12, 'square', 0.12)
    if (type === 'drop') tone(240, 0.14, 'triangle', 0.14)
    if (type === 'shove') {
      tone(160, 0.18, 'sawtooth', 0.1)
      tone(90, 0.2, 'square', 0.06)
    }
    if (type === 'steal') {
      tone(520, 0.1, 'square', 0.1)
      tone(340, 0.16, 'square', 0.1, 0.08)
      tone(180, 0.2, 'triangle', 0.12, 0.16)
    }
    if (type === 'checkout') {
      ;[523, 659, 784, 1046].forEach((freq, index) => tone(freq, 0.14, 'triangle', 0.1, index * 0.07))
    }
    if (type === 'legendary') {
      ;[392, 523, 659, 784].forEach((freq, index) => tone(freq, 0.22, 'square', 0.09, index * 0.09))
    }
    if (type === 'bump') tone(110, 0.16, 'sawtooth', 0.12)
    if (type === 'complete') {
      ;[523, 659, 784].forEach((freq, index) => tone(freq, 0.18, 'triangle', 0.12, index * 0.08))
    }
    if (type === 'join') tone(480, 0.08, 'sine', 0.06)
  } catch {
    // Le jeu continue si le son est bloqué.
  }
}

export function playVictory() {
  playSfx('complete')
  tone(880, 0.25, 'triangle', 0.1, 0.2)
}

export function playEnd() {
  tone(220, 0.25, 'sawtooth', 0.1)
  tone(140, 0.35, 'square', 0.08, 0.18)
}
