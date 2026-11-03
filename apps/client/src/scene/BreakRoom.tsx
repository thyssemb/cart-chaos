import { LOBBY, LOBBY_PROPS, LOBBY_SPOTS, type LobbyProp, type LobbySpotId } from '@cart-chaos/shared'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useGame } from '../store'
import { makeCodePlate, makePoster, makeRoster, makeSign } from './textures'

const WALL = '#f6d7b0'
const HEIGHT = 3.65
const THICK = 0.42

export function BreakRoom() {
  const wood = useMemo(() => woodFloor(), [])
  const posters = useMemo(
    () => ({
      pq: makePoster('PQ DORÉ', 'Ce n’est pas un coussin.', '#ffd56a', '#14323c'),
      cafe: makePoster('PAUSE CAFÉ', 'Le sprint attendra.', '#ff8fab', '#14323c'),
      pain: makePoster('ALERTE PAIN', 'Qui a pris le dernier ?', '#7ee0c6', '#14323c'),
    }),
    [],
  )
  useEffect(
    () => () => {
      wood.dispose()
      posters.pq.dispose()
      posters.cafe.dispose()
      posters.pain.dispose()
    },
    [wood, posters],
  )
  const innerX = LOBBY.maxX + 0.32
  const innerZ = LOBBY.maxZ + 0.32
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[28, 22]} />
        <meshStandardMaterial color="#87c8e8" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, innerZ + 2.2]} receiveShadow>
        <planeGeometry args={[16, 4]} />
        <meshStandardMaterial color="#8fce7a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[innerX * 2 + THICK, innerZ * 2 + THICK]} />
        <meshStandardMaterial map={wood} roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -0.35]} receiveShadow>
        <planeGeometry args={[6.4, 4.4]} />
        <meshStandardMaterial color="#fff1d4" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -0.35]} receiveShadow>
        <planeGeometry args={[5.7, 3.7]} />
        <meshStandardMaterial color="#4d96ff" />
      </mesh>
      <Ceiling />
      <Walls />
      {LOBBY_PROPS.map((prop) => (
        <PropMesh key={prop.id} prop={prop} />
      ))}
      <RosterBoard z={innerZ - 0.04} />
      <CodeScreen />
      <Mirror />
      <StartDoor z={-(innerZ - 0.04)} />
      <SpotMarker id="ready" color="#ffd56a" label="PRÊT" />
      <SpotMarker id="kiosk" color="#ff8fab" label="LOOK" />
      <SpotMarker id="code" color="#7eb6ff" label="CODE" />
      <SpotMarker id="door" color="#7dffb3" label="PORTE" />
      <Poster position={[-6.35, 2.15, innerZ - 0.05]} rotation={[0, Math.PI, 0]} map={posters.cafe} />
      <Poster position={[6.35, 2.15, innerZ - 0.05]} rotation={[0, Math.PI, 0]} map={posters.pq} />
      <Poster position={[-(innerX - 0.05), 2.05, -3.3]} rotation={[0, Math.PI / 2, 0]} map={posters.pain} />
      <Lamp position={[-4.6, 0, 3.15]} />
      <Lamp position={[4.9, 0, -3.6]} />
    </group>
  )
}

function Ceiling() {
  const w = (LOBBY.maxX + 0.32) * 2 + THICK
  const d = (LOBBY.maxZ + 0.32) * 2 + THICK
  return (
    <group>
      <mesh position={[0, HEIGHT, 0]} receiveShadow>
        <boxGeometry args={[w, 0.12, d]} />
        <meshStandardMaterial color="#fff8ee" />
      </mesh>
      {[-3.2, 3.2].map((x) => (
        <mesh key={x} position={[x, HEIGHT - 0.1, 0]}>
          <boxGeometry args={[2.4, 0.08, 0.42]} />
          <meshStandardMaterial color="#ffe7a8" emissive="#ffd27a" emissiveIntensity={0.55} />
        </mesh>
      ))}
    </group>
  )
}

function Walls() {
  const x = LOBBY.maxX + 0.32 + THICK / 2
  const z = LOBBY.maxZ + 0.32 + THICK / 2
  const spanX = x * 2
  const spanZ = (LOBBY.maxZ + 0.32) * 2
  return (
    <group>
      <Wall x={-x} y={HEIGHT / 2} z={0} w={THICK} h={HEIGHT} d={spanZ + THICK} />
      <Wall x={x} y={HEIGHT / 2} z={0} w={THICK} h={HEIGHT} d={spanZ + THICK} />
      <NorthWindows z={z} span={spanX} />
      <SouthDoor z={-z} span={spanX} />
    </group>
  )
}

function NorthWindows({ z, span }: { z: number; span: number }) {
  return (
    <group>
      <Wall x={0} y={0.62} z={z} w={span} h={1.24} d={THICK} />
      <Wall x={0} y={3.22} z={z} w={span} h={0.86} d={THICK} />
      <Wall x={-6.7} y={2.05} z={z} w={2.6} h={1.7} d={THICK} />
      <Wall x={0} y={2.05} z={z} w={2.2} h={1.7} d={THICK} />
      <Wall x={6.7} y={2.05} z={z} w={2.6} h={1.7} d={THICK} />
      {[-3.9, 3.9].map((x) => (
        <mesh key={x} position={[x, 2.05, z - 0.02]}>
          <planeGeometry args={[2.35, 1.45]} />
          <meshStandardMaterial color="#b9e6ff" transparent opacity={0.55} roughness={0.15} />
        </mesh>
      ))}
    </group>
  )
}

function SouthDoor({ z, span }: { z: number; span: number }) {
  return (
    <group>
      <Wall x={-4.6} y={HEIGHT / 2} z={z} w={span / 2 - 1.15} h={HEIGHT} d={THICK} />
      <Wall x={4.6} y={HEIGHT / 2} z={z} w={span / 2 - 1.15} h={HEIGHT} d={THICK} />
      <Wall x={0} y={3.15} z={z} w={2.3} h={1} d={THICK} />
    </group>
  )
}

function Wall({ x, y, z, w, h, d }: { x: number; y: number; z: number; w: number; h: number; d: number }) {
  return (
    <mesh position={[x, y, z]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={WALL} />
    </mesh>
  )
}

function PropMesh({ prop }: { prop: LobbyProp }) {
  if (prop.kind === 'sofa') return <Sofa prop={prop} />
  if (prop.kind === 'table') return <CoffeeTable prop={prop} />
  if (prop.kind === 'locker') return <Lockers prop={prop} />
  if (prop.kind === 'vend') return <Vending prop={prop} />
  if (prop.kind === 'plant') return <Plant prop={prop} />
  return <Counter prop={prop} />
}

function Sofa({ prop }: { prop: LobbyProp }) {
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[prop.w, 0.36, prop.d]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
      <mesh position={[0, 0.62, prop.d * 0.28]} castShadow>
        <boxGeometry args={[prop.w, 0.48, prop.d * 0.34]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.5, -0.04]} castShadow>
          <boxGeometry args={[0.7, 0.16, 0.62]} />
          <meshStandardMaterial color="#fff6df" />
        </mesh>
      ))}
    </group>
  )
}

function CoffeeTable({ prop }: { prop: LobbyProp }) {
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
        <boxGeometry args={[prop.w, 0.08, prop.d]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
      {[
        [-0.6, -0.28],
        [0.6, -0.28],
        [-0.6, 0.28],
        [0.6, 0.28],
      ].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x ?? 0, 0.16, z ?? 0]}>
          <boxGeometry args={[0.08, 0.32, 0.08]} />
          <meshStandardMaterial color="#8a5a32" />
        </mesh>
      ))}
      <mesh position={[0, 0.44, 0]}>
        <cylinderGeometry args={[0.12, 0.1, 0.08, 12]} />
        <meshStandardMaterial color="#fffaf2" />
      </mesh>
    </group>
  )
}

function Lockers({ prop }: { prop: LobbyProp }) {
  const doors = ['#ff5d6c', '#4d96ff', '#ffd23f', '#2ec4b6']
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, prop.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[prop.w, prop.h, prop.d]} />
        <meshStandardMaterial color="#d7dee8" />
      </mesh>
      {doors.map((color, index) => (
        <mesh key={color} position={[prop.w / 2 + 0.01, 0.42 + index * 0.42, 0]}>
          <boxGeometry args={[0.04, 0.36, prop.d * 0.86]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  )
}

function Vending({ prop }: { prop: LobbyProp }) {
  const drinks = prop.id === 'vend-a'
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, prop.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[prop.w, prop.h, prop.d]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
      <mesh position={[-prop.w / 2 - 0.01, 1.15, 0]}>
        <boxGeometry args={[0.04, 1.15, prop.d * 0.78]} />
        <meshStandardMaterial color={drinks ? '#7ee0ff' : '#ff8fab'} emissive={drinks ? '#4d96ff' : '#ff5d6c'} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[-prop.w / 2 - 0.04, 1.72, 0]}>
        <boxGeometry args={[0.02, 0.22, 0.62]} />
        <meshStandardMaterial color={drinks ? '#ffd56a' : '#7dffb3'} />
      </mesh>
    </group>
  )
}

function Plant({ prop }: { prop: LobbyProp }) {
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.18, 0.36, 10]} />
        <meshStandardMaterial color="#e07a4a" />
      </mesh>
      <mesh position={[0, 0.78, 0]} castShadow>
        <sphereGeometry args={[0.38, 14, 12]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
      <mesh position={[0.16, 1.02, 0.08]} castShadow>
        <sphereGeometry args={[0.24, 12, 10]} />
        <meshStandardMaterial color="#3ecf7a" />
      </mesh>
    </group>
  )
}

function Counter({ prop }: { prop: LobbyProp }) {
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, prop.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[prop.w, prop.h, prop.d]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
      <mesh position={[0, prop.h + 0.04, 0]} receiveShadow>
        <boxGeometry args={[prop.w + 0.08, 0.08, prop.d + 0.08]} />
        <meshStandardMaterial color="#fff6df" />
      </mesh>
    </group>
  )
}

function RosterBoard({ z }: { z: number }) {
  const signature = useGame((state) =>
    (state.room?.players ?? [])
      .filter((player) => player.connected)
      .map((player) => `${player.id}:${player.name}:${player.ready ? 1 : 0}:${player.host ? 1 : 0}`)
      .join('|'),
  )
  const map = useMemo(() => {
    const players = (useGame.getState().room?.players ?? []).filter((player) => player.connected)
    return makeRoster(players.map((player) => ({ name: player.name, ready: player.ready, host: player.host })))
  }, [signature])
  useEffect(() => () => map.dispose(), [map])
  return (
    <group position={[0, 1.85, z]}>
      <mesh castShadow>
        <boxGeometry args={[2.15, 2.35, 0.08]} />
        <meshStandardMaterial color="#8a5a32" />
      </mesh>
      <mesh position={[0, 0, -0.045]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.9, 2.1]} />
        <meshBasicMaterial map={map} toneMapped={false} />
      </mesh>
    </group>
  )
}

function CodeScreen() {
  const code = useGame((state) => state.room?.code ?? '----')
  const map = useMemo(() => makeCodePlate(code), [code])
  useEffect(() => () => map.dispose(), [map])
  const spot = LOBBY_SPOTS.code
  return (
    <mesh position={[spot.x - 1.02, 1.55, spot.z]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[0.92, 0.58]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  )
}

function Mirror() {
  const spot = LOBBY_SPOTS.kiosk
  return (
    <group position={[spot.x + 1.02, 1.55, spot.z]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh>
        <boxGeometry args={[0.86, 1.15, 0.06]} />
        <meshStandardMaterial color="#fff6df" />
      </mesh>
      <mesh position={[0, 0.02, 0.04]}>
        <planeGeometry args={[0.68, 0.9]} />
        <meshStandardMaterial color="#d7f6ff" metalness={0.55} roughness={0.12} />
      </mesh>
    </group>
  )
}

function StartDoor({ z }: { z: number }) {
  const ready = useGame((state) => {
    const room = state.room
    if (!room) return false
    const online = room.players.filter((player) => player.connected)
    return online.length > 0 && online.every((player) => player.ready)
  })
  return (
    <group position={[0, 1.15, z]}>
      <mesh castShadow>
        <boxGeometry args={[1.7, 2.3, 0.12]} />
        <meshStandardMaterial color={ready ? '#7dffb3' : '#ffb4a8'} emissive={ready ? '#1f9d55' : '#8a3030'} emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 0.15, -0.07]}>
        <planeGeometry args={[1.15, 0.42]} />
        <meshBasicMaterial color={ready ? '#14323c' : '#fff6df'} />
      </mesh>
    </group>
  )
}

function SpotMarker({ id, color, label }: { id: LobbySpotId; color: string; label: string }) {
  const spot = LOBBY_SPOTS[id]
  const map = useMemo(() => makeSign(label, color, '#14323c'), [label, color])
  useEffect(() => () => map.dispose(), [map])
  return (
    <group position={[spot.x, 0, spot.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
        <ringGeometry args={[0.38, 0.54, 28]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <sprite position={[0, 1.35, 0]} scale={[0.95, 0.3, 1]}>
        <spriteMaterial map={map} />
      </sprite>
    </group>
  )
}

function Poster({
  position,
  rotation,
  map,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  map: THREE.Texture
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[1.15, 1.5]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  )
}

function Lamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 1.4, 8]} />
        <meshStandardMaterial color="#8a5a32" />
      </mesh>
      <mesh position={[0, 1.45, 0]}>
        <coneGeometry args={[0.28, 0.32, 12]} />
        <meshStandardMaterial color="#ffe1a8" emissive="#ffb45a" emissiveIntensity={0.4} />
      </mesh>
      <pointLight position={[0, 1.35, 0]} color="#ffd7a8" intensity={2.4} distance={7} decay={2} />
    </group>
  )
}

function woodFloor() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(8, 6)
  if (!ctx) return texture
  ctx.fillStyle = '#e7b07a'
  ctx.fillRect(0, 0, 128, 128)
  ctx.strokeStyle = '#c9844a'
  ctx.lineWidth = 3
  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? '#efc08a' : '#e0a56c'
    ctx.fillRect(0, i * 32, 128, 30)
    ctx.strokeRect(0, i * 32, 128, 32)
  }
  texture.needsUpdate = true
  return texture
}
