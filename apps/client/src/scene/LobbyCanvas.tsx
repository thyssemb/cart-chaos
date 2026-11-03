import { LOBBY, LOBBY_OBSTACLES, lobbySpotAt, stepAvatar } from '@cart-chaos/shared'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { footstep, setListener, setWheel } from '../audio'
import { sendEmote, sendInput, sendReady, sendStart } from '../net'
import { useGame } from '../store'
import { control, debug, lerpAngle, lobbyUi, patchLobbyUi, readInput, requestLobbyCopy, views } from '../views'
import { Actors } from './Actors'
import { BreakRoom } from './BreakRoom'
import { REST_DISTANCE, REST_HEIGHT, REST_SIDE, applyMouseLook, cameraFrame, clampPitch, pullCamera, resolveArmScale } from './cameraRig'

const LOBBY_CEILING = 3.45
const LOBBY_TOP = 2.05

export function LobbyCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.25]}
      style={{ position: 'absolute', inset: '0', width: '100%', height: '100%' }}
      camera={{ fov: 52, position: [0, 2.4, -6], near: 0.1, far: 40 }}
      gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
    >
      <color attach="background" args={['#f6c9a0']} />
      <LobbyLights />
      <BreakRoom />
      <Actors playersOnly />
      <LobbySimulation />
      <LobbyCamera />
      <Locker />
    </Canvas>
  )
}

function LobbyLights() {
  return (
    <>
      <ambientLight intensity={0.62} color="#fff0dc" />
      <hemisphereLight args={['#fff4e2', '#e7b892', 0.48]} />
      <directionalLight
        position={[4, 8, 2]}
        intensity={0.85}
        color="#ffe2b0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
    </>
  )
}

function Locker() {
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    const element = gl.domElement
    const onClick = () => {
      if (control.uiLock) return
      void element.requestPointerLock()
    }
    element.addEventListener('click', onClick)
    return () => element.removeEventListener('click', onClick)
  }, [gl])
  return null
}

function typingTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
}

function LobbySimulation() {
  const seq = useRef(0)
  const sendAcc = useRef(0)
  const foot = useRef(0)
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.repeat) return
      const typing = typingTarget(event.target)
      const key = event.key.toLowerCase()
      if (!typing && (event.key === 'Tab' || event.key === ' ' || event.key.startsWith('Arrow'))) event.preventDefault()
      if (typing || control.uiLock) return
      if (key === 'enter') {
        event.preventDefault()
        patchLobbyUi({ chat: true })
        return
      }
      if (event.code === 'Digit1') {
        void sendEmote('wave')
        return
      }
      if (event.code === 'Digit2') {
        void sendEmote('dance')
        return
      }
      control.keys.add(key)
      if (key === ' ') control.jumpUntil = performance.now() + 180
      if (key === 'e') activateSpot()
    }
    const up = (event: KeyboardEvent) => {
      control.keys.delete(event.key.toLowerCase())
    }
    const move = (event: MouseEvent) => {
      if (!document.pointerLockElement || control.uiLock) return
      const settings = useGame.getState().settings
      const next = applyMouseLook(control.yaw, control.pitch, event.movementX, event.movementY, settings.sensitivity, settings.invertY)
      control.yaw = next.yaw
      control.pitch = next.pitch
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('mousemove', move)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('mousemove', move)
      control.keys.clear()
      control.interactHeld = false
      if (lobbyUi.chat || lobbyUi.kiosk) patchLobbyUi({ chat: false, kiosk: false })
    }
  }, [])

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.05)
    const state = useGame.getState()
    const room = state.room
    const meId = state.playerId
    if (!room || !meId) return
    const me = room.players.find((player) => player.id === meId)
    if (!me) return
    const roaming = room.phase === 'lobby' && !control.uiLock
    const liveInput = readInput()
    const input = roaming ? liveInput : { ...liveInput, forward: 0, strafe: 0, sprint: false, jump: false, interactHeld: false }
    const far = Math.hypot(me.x - views.local.x, me.z - views.local.z)
    if (!views.local.ready || far > 2.4) {
      views.local.x = me.x
      views.local.y = me.y
      views.local.z = me.z
      views.local.vx = me.vx
      views.local.vy = 0
      views.local.vz = me.vz
      views.local.yaw = me.yaw
      views.local.grounded = me.grounded
      views.local.ready = true
    }
    if (roaming) {
      stepAvatar(views.local, input, step, LOBBY_OBSTACLES, { holding: false, slow: false, bounds: LOBBY })
      const dx = me.x - views.local.x
      const dz = me.z - views.local.z
      if (Math.hypot(dx, dz) > 2.4) {
        views.local.x = me.x
        views.local.z = me.z
        views.local.vx = me.vx
        views.local.vz = me.vz
      } else {
        const correct = Math.min(1, step * 3.5)
        views.local.x += dx * correct
        views.local.z += dz * correct
      }
      if (Math.abs(me.y - views.local.y) > 1.5) views.local.y = me.y
      else views.local.y += (me.y - views.local.y) * Math.min(1, step * 8)
    } else {
      views.local.vx = 0
      views.local.vz = 0
      views.local.vy = 0
      const blend = Math.min(1, step * 12)
      views.local.x += (me.x - views.local.x) * blend
      views.local.y += (me.y - views.local.y) * blend
      views.local.z += (me.z - views.local.z) * blend
      views.local.yaw = lerpAngle(views.local.yaw, me.yaw, blend)
    }

    sendAcc.current += step
    if (sendAcc.current >= 0.05) {
      sendAcc.current = 0
      seq.current += 1
      sendInput({ ...input, seq: seq.current, yaw: control.yaw })
    }

    const smooth = 1 - Math.exp(-14 * step)
    for (const player of room.players) {
      const current = views.players.get(player.id)
      const local = player.id === meId
      const pose = current ?? {
        x: player.x,
        y: player.y,
        z: player.z,
        yaw: player.yaw,
        vx: 0,
        vz: 0,
        speed: 0,
        grounded: true,
        holding: false,
        carrying: false,
        hit: false,
        celebrate: false,
        connected: true,
        emote: null,
      }
      if (local && roaming) {
        pose.x = views.local.x
        pose.y = views.local.y
        pose.z = views.local.z
        pose.yaw = views.local.yaw
        pose.speed = Math.hypot(views.local.vx, views.local.vz)
        pose.vx = views.local.vx
        pose.vz = views.local.vz
        pose.grounded = views.local.grounded
      } else {
        pose.x += (player.x - pose.x) * (local ? 1 : smooth)
        pose.y += (player.y - pose.y) * (local ? 1 : smooth)
        pose.z += (player.z - pose.z) * (local ? 1 : smooth)
        pose.yaw = local ? views.local.yaw : lerpAngle(pose.yaw, player.yaw, smooth)
        pose.speed = Math.hypot(player.vx, player.vz)
        pose.vx = player.vx
        pose.vz = player.vz
        pose.grounded = player.grounded
      }
      pose.holding = false
      pose.carrying = false
      pose.hit = false
      pose.celebrate = false
      pose.connected = player.connected
      pose.emote = player.emote
      views.players.set(player.id, pose)
    }

    const planar = Math.hypot(views.local.vx, views.local.vz)
    setWheel(0)
    setListener(views.local.x, views.local.z, control.yaw)
    if (roaming && views.local.grounded && planar > 0.85) {
      foot.current += planar * step
      const along = Math.sin(views.local.yaw) * views.local.vx + Math.cos(views.local.yaw) * views.local.vz
      const stride = along < -0.85 ? 0.4 : planar > 5.6 ? 0.52 : 0.74
      if (foot.current >= stride) {
        foot.current = 0
        footstep(planar)
      }
    } else foot.current = 0
  })
  return null
}

function activateSpot() {
  const state = useGame.getState()
  const room = state.room
  const me = room?.players.find((player) => player.id === state.playerId)
  if (!room || !me || room.phase !== 'lobby') {
    state.setFlash('Pas maintenant')
    return
  }
  const spot = lobbySpotAt(views.local.x, views.local.z)
  if (spot === 'ready') {
    void sendReady()
    return
  }
  if (spot === 'kiosk') {
    patchLobbyUi({ kiosk: true })
    return
  }
  if (spot === 'code') {
    requestLobbyCopy()
    return
  }
  if (spot === 'door') {
    const online = room.players.filter((player) => player.connected)
    const hostOnline = online.some((player) => player.host)
    if (hostOnline && !me.host) {
      state.setFlash('L’hôte lance la manche')
      return
    }
    if (!online.every((player) => player.ready)) {
      state.setFlash('Tout le monde doit être prêt')
      return
    }
    void sendStart()
    return
  }
  state.setFlash('Rien à portée')
}

function LobbyCamera() {
  const look = useRef(new THREE.Vector3())
  const ready = useRef(false)
  const scale = useRef(1)
  useFrame((state, delta) => {
    const game = useGame.getState()
    const meId = game.playerId
    const pose = meId ? views.players.get(meId) : undefined
    const px = pose?.x ?? 0
    const py = pose?.y ?? 0
    const pz = pose?.z ?? 0
    const motion = game.settings.camera
    const sprinting = (pose?.speed ?? 0) > 9.4 && motion > 0.05
    const input = {
      x: px,
      y: py,
      z: pz,
      yaw: control.yaw,
      pitch: clampPitch(control.pitch),
      distance: REST_DISTANCE + (sprinting ? 0.45 * motion : 0),
      height: REST_HEIGHT + (sprinting ? 0.12 * motion : 0),
      side: REST_SIDE,
    }
    const resolved = resolveArmScale(input, LOBBY_OBSTACLES, LOBBY, LOBBY_CEILING, LOBBY_TOP)
    const follow = 1 - Math.exp(-9 * delta)
    if (!ready.current) scale.current = resolved
    else scale.current += (resolved - scale.current) * follow
    const frame = cameraFrame(input, scale.current)
    const camera = state.camera as THREE.PerspectiveCamera
    if (!ready.current) {
      camera.position.set(frame.x, frame.y, frame.z)
      ready.current = true
    }
    const k = 1 - Math.exp(-7 * delta)
    camera.position.x += (frame.x - camera.position.x) * k
    camera.position.y += (frame.y - camera.position.y) * k
    camera.position.z += (frame.z - camera.position.z) * k
    const safe = pullCamera(px, py, pz, camera.position.x, camera.position.y, camera.position.z, LOBBY_OBSTACLES, LOBBY, LOBBY_CEILING, LOBBY_TOP)
    camera.position.set(safe.x, safe.y, safe.z)
    look.current.set(frame.lookX, frame.lookY, frame.lookZ)
    camera.lookAt(look.current)
    if (import.meta.env.DEV) {
      debug.camera = { x: safe.x, y: safe.y, z: safe.z, lookX: frame.lookX, lookY: frame.lookY, lookZ: frame.lookZ }
    }
    const fov = 50 + (sprinting ? 5.5 * motion : 0)
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov += (fov - camera.fov) * (1 - Math.exp(-4 * delta))
      camera.updateProjectionMatrix()
    }
  })
  return null
}
