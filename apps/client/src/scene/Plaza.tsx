import { LOBBY_MODE, LOBBY_PROPS, LOBBY_SPOTS, type LobbyProp } from '@cart-chaos/shared'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useGame } from '../store'
import { makeCodePlate, makeRoster, makeSign } from './textures'

const SKY_VERT = `
varying vec3 vDir;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vDir = world.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const SKY_FRAG = `
varying vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  float h = dir.y;
  vec3 zenith = vec3(0.28, 0.11, 0.40);
  vec3 high = vec3(0.58, 0.22, 0.46);
  vec3 mid = vec3(0.95, 0.38, 0.46);
  vec3 horizon = vec3(1.0, 0.62, 0.40);
  vec3 below = vec3(0.96, 0.58, 0.40);
  vec3 col = mix(below, horizon, smoothstep(-0.15, 0.02, h));
  col = mix(col, mid, smoothstep(0.0, 0.2, h));
  col = mix(col, high, smoothstep(0.16, 0.5, h));
  col = mix(col, zenith, smoothstep(0.4, 0.95, h));
  vec3 sunDir = normalize(vec3(0.55, 0.14, -0.62));
  float sun = pow(max(dot(dir, sunDir), 0.0), 240.0);
  float glow = pow(max(dot(dir, sunDir), 0.0), 7.0);
  col += vec3(1.0, 0.82, 0.5) * sun * 1.5;
  col += vec3(1.0, 0.46, 0.28) * glow * 0.42;
  float cloud = 0.0;
  if (h > -0.08) {
    vec2 p = dir.xz / max(0.18, h * 0.55 + 0.28);
    vec2 c0 = (p - vec2(0.1, 2.55)) / vec2(2.3, 0.9);
    vec2 c1 = (p - vec2(-2.3, 2.9)) / vec2(1.6, 0.72);
    vec2 c2 = (p - vec2(2.5, 2.25)) / vec2(1.7, 0.78);
    vec2 c3 = (p - vec2(-0.6, 0.35)) / vec2(1.6, 0.7);
    vec2 c4 = (p - vec2(1.6, 0.05)) / vec2(1.4, 0.58);
    cloud += 1.0 - smoothstep(0.35, 1.0, dot(c0, c0));
    cloud += 1.0 - smoothstep(0.35, 1.0, dot(c1, c1));
    cloud += 1.0 - smoothstep(0.35, 1.0, dot(c2, c2));
    cloud += 1.0 - smoothstep(0.4, 1.0, dot(c3, c3));
    cloud += 1.0 - smoothstep(0.4, 1.0, dot(c4, c4));
    cloud = clamp(cloud, 0.0, 1.0) * smoothstep(-0.05, 0.05, h);
  }
  vec3 cloudCol = vec3(1.0, 0.82, 0.8);
  col = mix(col, cloudCol, cloud * 0.9);
  gl_FragColor = vec4(col, 1.0);
}
`

export function Plaza() {
  const grocery = LOBBY_PROPS.find((prop) => prop.id === 'grocery')!
  const cafe = LOBBY_PROPS.find((prop) => prop.id === 'cafe')!
  return (
    <group>
      <SunsetSky />
      <Ground />
      <Hills />
      {LOBBY_PROPS.map((prop) => (
        <Prop key={prop.id} prop={prop} />
      ))}
      <ReadyBoard grocery={grocery} />
      <CodeBoard />
      <Mirror />
      <Awning prop={cafe} />
      <Balloons />
      <Court />
    </group>
  )
}

function SunsetSky() {
  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[90, 28, 18]} />
      <shaderMaterial vertexShader={SKY_VERT} fragmentShader={SKY_FRAG} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  )
}

function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0.6]} receiveShadow>
        <planeGeometry args={[46, 38]} />
        <meshStandardMaterial color="#6fbf6a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -0.4]} receiveShadow>
        <circleGeometry args={[7.2, 40]} />
        <meshStandardMaterial color="#f3d2a2" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.6, -0.01, 2.4]} receiveShadow>
        <planeGeometry args={[3.2, 9.5]} />
        <meshStandardMaterial color="#efc894" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.6, -0.01, -1.2]} receiveShadow>
        <planeGeometry args={[8.5, 2.4]} />
        <meshStandardMaterial color="#efc894" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8.6, -0.01, 1.5]} receiveShadow>
        <planeGeometry args={[2.3, 7.2]} />
        <meshStandardMaterial color="#e7c08a" />
      </mesh>
    </group>
  )
}

function Hills() {
  const hills = [
    [-18, 16, 7, 3.2],
    [-8, 18, 8, 2.6],
    [4, 17.5, 9, 3.4],
    [16, 16, 7, 2.8],
    [20, 4, 6, 2.2],
    [-20, -2, 6, 2.4],
  ]
  return (
    <group>
      {hills.map(([x, z, w, h]) => (
        <mesh key={`${x}-${z}`} position={[x ?? 0, (h ?? 1) / 2 - 0.4, z ?? 0]}>
          <sphereGeometry args={[(w ?? 4) * 0.45, 10, 8]} />
          <meshStandardMaterial color="#c47a86" />
        </mesh>
      ))}
    </group>
  )
}

function Prop({ prop }: { prop: LobbyProp }) {
  if (prop.kind === 'grocery') return <Grocery prop={prop} />
  if (prop.kind === 'cafe') return <Cafe prop={prop} />
  if (prop.kind === 'stall') return <Stall prop={prop} />
  if (prop.kind === 'podium') return <Podium prop={prop} />
  if (prop.kind === 'bench') return <Bench prop={prop} />
  if (prop.kind === 'vend') return <Vendor prop={prop} />
  if (prop.kind === 'hedge') return <Hedge prop={prop} />
  if (prop.kind === 'palm') return <Palm prop={prop} />
  if (prop.kind === 'table') return <TerraceTable prop={prop} />
  if (prop.kind === 'sign') return <SignFrame prop={prop} />
  if (prop.kind === 'hoop') return <Hoop prop={prop} />
  if (prop.kind === 'stairs') return <Stairs prop={prop} />
  return <Planter prop={prop} />
}

function Grocery({ prop }: { prop: LobbyProp }) {
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, prop.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[prop.w, prop.h, prop.d]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
      <mesh position={[0, 1.55, -prop.d / 2 - 0.02]}>
        <boxGeometry args={[prop.w * 0.82, 1.15, 0.08]} />
        <meshStandardMaterial color="#1d2430" />
      </mesh>
      <mesh position={[0, 1.55, -prop.d / 2 - 0.07]}>
        <boxGeometry args={[prop.w * 0.78, 0.08, 0.06]} />
        <meshStandardMaterial color="#ffe14a" emissive="#ffd56a" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[0, 3.55, -prop.d / 2 - 0.04]}>
        <boxGeometry args={[prop.w + 0.2, 0.16, 0.16]} />
        <meshStandardMaterial color="#ffe14a" emissive="#ffcc4d" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[0, 3.15, -prop.d / 2 - 0.05]}>
        <boxGeometry args={[3.4, 0.7, 0.08]} />
        <meshStandardMaterial color="#ff5d6c" />
      </mesh>
      <mesh position={[0, 0.15, -prop.d / 2 - 0.35]} receiveShadow>
        <boxGeometry args={[prop.w * 0.7, 0.28, 0.7]} />
        <meshStandardMaterial color="#6fbf73" />
      </mesh>
    </group>
  )
}

function Cafe({ prop }: { prop: LobbyProp }) {
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, prop.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[prop.w, prop.h, prop.d]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
      <mesh position={[0, 2.4, -prop.d / 2 - 0.04]}>
        <boxGeometry args={[prop.w * 0.7, 0.85, 0.08]} />
        <meshStandardMaterial color="#203040" />
      </mesh>
      <mesh position={[0, 3.35, 0]}>
        <boxGeometry args={[prop.w + 0.3, 0.18, prop.d + 0.3]} />
        <meshStandardMaterial color="#ffe14a" emissive="#ffcc4d" emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[0, 2.9, -prop.d / 2 - 0.06]}>
        <boxGeometry args={[2.6, 0.55, 0.08]} />
        <meshStandardMaterial color="#fff6df" />
      </mesh>
    </group>
  )
}

function Awning({ prop }: { prop: LobbyProp }) {
  return (
    <mesh position={[prop.x, 2.7, prop.z - prop.d / 2 - 1.15]} castShadow>
      <boxGeometry args={[prop.w * 0.85, 0.08, 2.2]} />
      <meshStandardMaterial color="#ff5d6c" />
    </mesh>
  )
}

function Stall({ prop }: { prop: LobbyProp }) {
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, prop.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[prop.w, prop.h, prop.d]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
      <mesh position={[0, prop.h + 0.08, 0]}>
        <boxGeometry args={[prop.w + 0.2, 0.12, prop.d + 0.2]} />
        <meshStandardMaterial color="#fff6df" />
      </mesh>
      <mesh position={[0, prop.h + 0.45, 0]}>
        <boxGeometry args={[1.3, 0.4, 0.08]} />
        <meshStandardMaterial color="#14323c" />
      </mesh>
    </group>
  )
}

function Podium({ prop }: { prop: LobbyProp }) {
  const ready = useGame((state) => {
    const room = state.room
    if (!room) return false
    const online = room.players.filter((player) => player.connected)
    return online.length > 0 && online.every((player) => player.ready)
  })
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, 0.28, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.85, 0.95, 0.5, 18]} />
        <meshStandardMaterial color="#f2d7b0" />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <cylinderGeometry args={[0.62, 0.68, 0.18, 16]} />
        <meshStandardMaterial color={ready ? '#7dffb3' : '#8fd8ff'} emissive={ready ? '#1f9d55' : '#1a6ea8'} emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.7, 8]} />
        <meshStandardMaterial color="#fff6df" />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.22, 14, 12]} />
        <meshStandardMaterial color={ready ? '#7dffb3' : '#ffd56a'} emissive={ready ? '#39c97a' : '#ffb703'} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, 1.85, -0.55]}>
        <boxGeometry args={[1.15, 0.32, 0.06]} />
        <meshStandardMaterial color="#14323c" />
      </mesh>
    </group>
  )
}

function Bench({ prop }: { prop: LobbyProp }) {
  const alongX = prop.w > prop.d
  return (
    <group position={[prop.x, 0, prop.z]} rotation={[0, alongX ? 0 : Math.PI / 2, 0]}>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[Math.max(prop.w, prop.d), 0.1, 0.42]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
      <mesh position={[0, 0.68, -0.16]} castShadow>
        <boxGeometry args={[Math.max(prop.w, prop.d), 0.38, 0.08]} />
        <meshStandardMaterial color="#a86b34" />
      </mesh>
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.2, 0]}>
          <boxGeometry args={[0.08, 0.4, 0.36]} />
          <meshStandardMaterial color="#6b4324" />
        </mesh>
      ))}
    </group>
  )
}

function Vendor({ prop }: { prop: LobbyProp }) {
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, prop.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[prop.w, prop.h, prop.d]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
      <mesh position={[0, 1.15, prop.d / 2 + 0.02]}>
        <boxGeometry args={[prop.w * 0.7, 0.7, 0.04]} />
        <meshStandardMaterial color="#9ad7ff" emissive="#7ec8e3" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 0.45, prop.d / 2 + 0.03]}>
        <boxGeometry args={[0.28, 0.12, 0.04]} />
        <meshStandardMaterial color="#ffd56a" />
      </mesh>
    </group>
  )
}

function Hedge({ prop }: { prop: LobbyProp }) {
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, prop.h * 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[prop.w, prop.h * 0.9, prop.d]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
      <mesh position={[0, prop.h * 0.92, 0]}>
        <boxGeometry args={[prop.w * 0.92, prop.h * 0.28, prop.d * 0.92]} />
        <meshStandardMaterial color="#57b86a" />
      </mesh>
    </group>
  )
}

function Palm({ prop }: { prop: LobbyProp }) {
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, 2.3, 7]} />
        <meshStandardMaterial color="#c9844a" />
      </mesh>
      {[0, 1, 2, 3, 4].map((index) => (
        <mesh key={index} position={[Math.cos(index) * 0.12, 2.55, Math.sin(index) * 0.12]} rotation={[0.9, index * 1.2, 0]}>
          <coneGeometry args={[0.16, 0.78, 5]} />
          <meshStandardMaterial color="#3ecf7a" />
        </mesh>
      ))}
    </group>
  )
}

function TerraceTable({ prop }: { prop: LobbyProp }) {
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.48, 0.48, 0.08, 14]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.7, 8]} />
        <meshStandardMaterial color="#8a5a32" />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <coneGeometry args={[0.85, 0.38, 12]} />
        <meshStandardMaterial color={prop.x > 7 ? '#7eb6ff' : '#ffd56a'} />
      </mesh>
      <mesh position={[0, 1.28, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.9, 6]} />
        <meshStandardMaterial color="#fff6df" />
      </mesh>
    </group>
  )
}

function SignFrame({ prop }: { prop: LobbyProp }) {
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[prop.w, 1.7, prop.d]} />
        <meshStandardMaterial color="#14323c" />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.12, 0.7, 0.12]} />
        <meshStandardMaterial color="#8a5a32" />
      </mesh>
    </group>
  )
}

function Hoop({ prop }: { prop: LobbyProp }) {
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 3, 8]} />
        <meshStandardMaterial color="#f7f7f2" />
      </mesh>
      <mesh position={[-0.45, 2.85, 0]}>
        <boxGeometry args={[0.9, 0.6, 0.06]} />
        <meshStandardMaterial color="#fff6df" />
      </mesh>
      <mesh position={[-0.45, 2.85, 0.04]}>
        <boxGeometry args={[0.55, 0.32, 0.02]} />
        <meshStandardMaterial color="#ff5d6c" />
      </mesh>
      <mesh position={[-0.85, 2.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.035, 8, 16]} />
        <meshStandardMaterial color="#ff8a3d" />
      </mesh>
    </group>
  )
}

function Stairs({ prop }: { prop: LobbyProp }) {
  const steps = [0.22, 0.42, 0.64, 0.86]
  return (
    <group position={[prop.x, 0, prop.z]}>
      {steps.map((height, index) => (
        <mesh key={height} position={[0, height / 2, -0.55 + index * 0.28]} castShadow receiveShadow>
          <boxGeometry args={[prop.w, height, 0.32]} />
          <meshStandardMaterial color={index % 2 ? '#f6e2c4' : prop.color} />
        </mesh>
      ))}
    </group>
  )
}

function Planter({ prop }: { prop: LobbyProp }) {
  const blooms = ['#ff5d8f', '#ffd23f', '#b388ff', '#ff8a5b']
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <boxGeometry args={[prop.w, 0.4, prop.d]} />
        <meshStandardMaterial color="#f4f7fb" />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[prop.w * 0.92, 0.12, prop.d * 0.8]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
      {blooms.map((color, index) => (
        <mesh key={color} position={[-prop.w * 0.32 + index * prop.w * 0.21, 0.62, 0]}>
          <sphereGeometry args={[0.12, 8, 6]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  )
}

function ReadyBoard({ grocery }: { grocery: LobbyProp }) {
  const signature = useGame((state) =>
    (state.room?.players ?? [])
      .filter((player) => player.connected)
      .map((player) => `${player.id}:${player.name}:${player.ready ? 1 : 0}:${player.host ? 1 : 0}`)
      .join('|'),
  )
  const roster = useMemo(() => {
    const players = (useGame.getState().room?.players ?? []).filter((player) => player.connected)
    return makeRoster(players.map((player) => ({ name: player.name, ready: player.ready, host: player.host })))
  }, [signature])
  const mode = useMemo(() => makeSign(LOBBY_MODE.label.toLocaleUpperCase('fr-FR'), '#ffd56a', '#14323c'), [])
  useEffect(
    () => () => {
      roster.dispose()
      mode.dispose()
    },
    [roster, mode],
  )
  const z = grocery.z - grocery.d / 2 - 0.06
  return (
    <group position={[grocery.x, 1.7, z]}>
      <mesh castShadow>
        <boxGeometry args={[2.2, 2.45, 0.08]} />
        <meshStandardMaterial color="#8a5a32" />
      </mesh>
      <mesh position={[0, -0.15, -0.05]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.95, 1.85]} />
        <meshBasicMaterial map={roster} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.45, -0.05]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.7, 0.42]} />
        <meshBasicMaterial map={mode} toneMapped={false} />
      </mesh>
    </group>
  )
}

function CodeBoard() {
  const code = useGame((state) => state.room?.code ?? '----')
  const map = useMemo(() => makeCodePlate(code), [code])
  useEffect(() => () => map.dispose(), [map])
  const spot = LOBBY_SPOTS.code
  return (
    <mesh position={[spot.x + 1.45, 1.45, spot.z]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[1.15, 0.72]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  )
}

function Mirror() {
  const spot = LOBBY_SPOTS.kiosk
  return (
    <group position={[spot.x - 1.15, 1.45, spot.z]}>
      <mesh castShadow>
        <boxGeometry args={[0.08, 1.35, 1.05]} />
        <meshStandardMaterial color="#fff6df" />
      </mesh>
      <mesh position={[0.06, 0.05, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.9, 1.1]} />
        <meshStandardMaterial color="#d7f6ff" metalness={0.45} roughness={0.15} />
      </mesh>
    </group>
  )
}

function Balloons() {
  const colors = ['#ff5d6c', '#ffd23f', '#7eb6ff', '#5ee0a0']
  return (
    <group position={[2.15, 0, -0.55]}>
      {colors.map((color, index) => (
        <group key={color} position={[index * 0.28 - 0.4, 0, 0]}>
          <mesh position={[0, 2.15 + (index % 2) * 0.18, 0]}>
            <sphereGeometry args={[0.16, 10, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 1.35, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 1.3, 4]} />
            <meshStandardMaterial color="#fff6df" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Court() {
  return (
    <group position={[10.2, 0.01, -4.6]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.6, 3.2]} />
        <meshStandardMaterial color="#d9855a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.55, 0.62, 20]} />
        <meshBasicMaterial color="#fff6df" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.7, 0.01, 0]}>
        <planeGeometry args={[0.08, 3.2]} />
        <meshBasicMaterial color="#fff6df" />
      </mesh>
    </group>
  )
}
