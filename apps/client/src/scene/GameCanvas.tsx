import {
  CART_RADIUS,
  CART_SLOTS,
  PRODUCT_HEIGHT,
  OBSTACLES,
  cartAnchor,
  discObstacle,
  slotWorld,
  stepAvatar,
} from '@cart-chaos/shared'
import { Physics } from '@react-three/rapier'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Component, useEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { footstep, setListener, setWheel } from '../audio'
import { sendAction, sendInput } from '../net'
import { useGame } from '../store'
import { Actors, DemoCrew } from './Actors'
import { shelfFacing } from './foodPack'
import { Supermarket } from './Supermarket'
import {
  REST_DISTANCE,
  REST_HEIGHT,
  REST_SIDE,
  applyMouseLook,
  cameraFrame,
  clampPitch,
  pullCamera,
  resolveArmScale,
} from './cameraRig'
import { control, debug, lerpAngle, readInput, views } from '../views'

class Guard extends Component<{ children: ReactNode; fallback: ReactNode }, { bad: boolean }> {
  state = { bad: false }
  static getDerivedStateFromError() {
    return { bad: true }
  }
  render() {
    return this.state.bad ? this.props.fallback : this.props.children
  }
}

function World({ children }: { children: ReactNode }) {
  return (
    <Guard
      fallback={
        <>
          <Supermarket physics={false} />
          {children}
        </>
      }
    >
      <Physics gravity={[0, -12, 0]} paused>
        <Supermarket />
        {children}
      </Physics>
    </Guard>
  )
}

export function MenuCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.25]}
      style={{ position: 'absolute', inset: '0', width: '100%', height: '100%' }}
      camera={{ fov: 48, position: [14, 12, 16], near: 0.1, far: 120 }}
      gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
    >
      <color attach="background" args={['#bfe6b0']} />
      <Lights />
      <World>
        <DemoCrew />
      </World>
    </Canvas>
  )
}

export function GameCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.25]}
      style={{ position: 'absolute', inset: '0', width: '100%', height: '100%' }}
      camera={{ fov: 52, position: [12, 4, -16], near: 0.1, far: 90 }}
      gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
    >
      <color attach="background" args={['#c9e8bf']} />
      <Lights />
      <World>
        <Actors />
        <Simulation />
        <CameraRig />
        <Locker />
      </World>
    </Canvas>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.72} color="#fff4e4" />
      <hemisphereLight args={['#fff7df', '#8fd0b0', 0.5]} />
      <directionalLight
        position={[12, 18, 8]}
        intensity={1.05}
        color="#fff1d0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
      />
    </>
  )
}

function Locker() {
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    const element = gl.domElement
    const onClick = () => {
      if (useGame.getState().paused) return
      void element.requestPointerLock()
    }
    element.addEventListener('click', onClick)
    return () => element.removeEventListener('click', onClick)
  }, [gl])
  return null
}

function Simulation() {
  const seq = useRef(0)
  const sendAcc = useRef(0)
  const foot = useRef(0)
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.repeat) return
      const key = event.key.toLowerCase()
      if (event.key === 'Tab' || event.key === ' ' || event.key.startsWith('Arrow')) event.preventDefault()
      if (key === 'escape') {
        const state = useGame.getState()
        if (state.screen === 'game' && state.room?.phase === 'playing') {
          state.setPaused(!state.paused)
          document.exitPointerLock()
        }
        return
      }
      control.keys.add(key)
      if (useGame.getState().paused) return
      if (key === ' ') control.jumpUntil = performance.now() + 180
      if (key === 'e') {
        control.interactHeld = true
        sendAction('interact')
      }
      if (key === 'f') sendAction('grab')
    }
    const up = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      control.keys.delete(key)
      if (key === 'e') control.interactHeld = false
    }
    const move = (event: MouseEvent) => {
      if (!document.pointerLockElement) return
      const settings = useGame.getState().settings
      const next = applyMouseLook(
        control.yaw,
        control.pitch,
        event.movementX,
        event.movementY,
        settings.sensitivity,
        settings.invertY,
      )
      control.yaw = next.yaw
      control.pitch = next.pitch
    }
    const click = (event: MouseEvent) => {
      if (event.button === 0 && document.pointerLockElement) sendAction('shove')
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('mousemove', move)
    window.addEventListener('mousedown', click)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mousedown', click)
      control.keys.clear()
      control.interactHeld = false
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
    const playing = room.phase === 'playing' && !state.paused
    const liveInput = readInput()
    const input = playing
      ? liveInput
      : { ...liveInput, forward: 0, strafe: 0, sprint: false, jump: false, interactHeld: false }

    if (playing) {
      if (!views.local.ready) {
        views.local.x = me.x
        views.local.y = me.y
        views.local.z = me.z
        views.local.vx = me.vx
        views.local.vy = 0
        views.local.vz = me.vz
        views.local.yaw = me.yaw
        views.local.grounded = me.grounded
        views.local.ready = true
        control.yaw = me.yaw
        control.pitch = 0
      }
      const extras = room.carts
        .filter((cart) => !(me.holdingCart && cart.ownerId === meId))
        .map((cart) => discObstacle(cart.x, cart.z, CART_RADIUS, cart.id))
      stepAvatar(views.local, input, step, OBSTACLES, { holding: me.holdingCart, slow: me.slow, extras })
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
      views.local.ready = false
      views.local.x = me.x
      views.local.y = me.y
      views.local.z = me.z
    }

    sendAcc.current += step
    if (sendAcc.current >= 0.05) {
      sendAcc.current = 0
      seq.current += 1
      sendInput({ ...input, seq: seq.current, yaw: control.yaw })
    }

    const best = Math.max(0, ...room.players.map((player) => player.score))
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
      }
      if (local && playing) {
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
        pose.yaw = local ? control.yaw : lerpAngle(pose.yaw, player.yaw, smooth)
        pose.speed = Math.hypot(player.vx, player.vz)
        pose.vx = player.vx
        pose.vz = player.vz
        pose.grounded = player.grounded
      }
      pose.holding = player.holdingCart
      pose.carrying = Boolean(player.carryingId)
      pose.hit = player.hit
      pose.celebrate = room.phase === 'results' && player.score === best
      pose.connected = player.connected
      views.players.set(player.id, pose)

      if (player.holdingCart && player.id === meId && playing) {
        const anchor = cartAnchor(pose.x, pose.z, pose.yaw)
        views.carts.set(player.id, { x: anchor.x, z: anchor.z, yaw: pose.yaw, held: true, count: 0 })
      }
    }

    for (const cart of room.carts) {
      const owner = room.players.find((player) => player.id === cart.ownerId)
      const predicted = owner?.id === meId && owner.holdingCart && playing
      const current = views.carts.get(cart.id) ?? { x: cart.x, z: cart.z, yaw: cart.yaw, held: cart.held, count: cart.itemIds.length }
      if (!predicted) {
        current.x += (cart.x - current.x) * smooth
        current.z += (cart.z - current.z) * smooth
        current.yaw = lerpAngle(current.yaw, cart.yaw, smooth)
      }
      current.held = cart.held
      current.count = cart.itemIds.length
      views.carts.set(cart.id, current)
    }

    for (const product of room.products) {
      let x = product.x
      let y = product.y
      let z = product.z
      let yaw = 0
      let scale = 1
      if (product.state === 'cart' && product.ownerId) {
        const cart = room.carts.find((item) => item.ownerId === product.ownerId && item.itemIds.includes(product.id))
        const pose = cart ? views.carts.get(cart.id) : undefined
        if (cart && pose) {
          const index = Math.max(0, cart.itemIds.indexOf(product.id))
          const world = slotWorld(pose.x, pose.z, pose.yaw, CART_SLOTS[index] ?? CART_SLOTS[0]!)
          scale = 0.68
          x = world.x
          y = world.y + (PRODUCT_HEIGHT[product.type] * scale) / 2
          z = world.z
          yaw = pose.yaw + Math.PI
        }
      } else if (product.state === 'carried' && product.ownerId) {
        const owner = views.players.get(product.ownerId)
        if (owner) {
          const side = 1.05
          const forward = 0.08
          x = owner.x + Math.sin(owner.yaw) * forward + Math.cos(owner.yaw) * side
          z = owner.z + Math.cos(owner.yaw) * forward - Math.sin(owner.yaw) * side
          y = owner.y + 0.92
          yaw = owner.yaw + Math.PI
        }
      } else if (product.state === 'shelf') {
        yaw = shelfFacing(x, z)
      }
      views.products.set(product.id, {
        x,
        y,
        z,
        yaw,
        scale,
        visible: product.state !== 'hidden' && product.state !== 'validated',
        beacon: product.type === 'legendary' && product.state !== 'hidden' && product.state !== 'validated',
      })
    }

    const planar = Math.hypot(views.local.vx, views.local.vz)
    const speed = playing && me.holdingCart ? planar : 0
    setWheel(speed > 0.4 ? Math.min(0.12, speed * 0.012) : 0)
    setListener(views.local.x, views.local.z, control.yaw)
    if (playing && views.local.grounded && planar > 0.85) {
      foot.current += planar * step
      const along = Math.sin(views.local.yaw) * views.local.vx + Math.cos(views.local.yaw) * views.local.vz
      const stride = along < -0.85 ? 0.4 : planar > 5.6 ? 0.52 : 0.74
      if (foot.current >= stride) {
        foot.current = 0
        footstep(planar)
      }
    } else {
      foot.current = 0
    }
  })
  return null
}

function CameraRig() {
  const look = useRef(new THREE.Vector3())
  const ready = useRef(false)
  const scale = useRef(1)
  useFrame((state, delta) => {
    const game = useGame.getState()
    const meId = game.playerId
    const pose = meId ? views.players.get(meId) : undefined
    const px = pose?.x ?? 11
    const py = pose?.y ?? 0
    const pz = pose?.z ?? -7
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
    const resolved = resolveArmScale(input, OBSTACLES)
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
    const safe = pullCamera(px, py, pz, camera.position.x, camera.position.y, camera.position.z, OBSTACLES)
    camera.position.set(safe.x, safe.y, safe.z)
    look.current.set(frame.lookX, frame.lookY, frame.lookZ)
    camera.lookAt(look.current)
    if (import.meta.env.DEV) {
      debug.camera = {
        x: safe.x,
        y: safe.y,
        z: safe.z,
        lookX: frame.lookX,
        lookY: frame.lookY,
        lookZ: frame.lookZ,
      }
    }
    const fov = 50 + (sprinting ? 5.5 * motion : 0)
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov += (fov - camera.fov) * (1 - Math.exp(-4 * delta))
      camera.updateProjectionMatrix()
    }
  })
  return null
}
