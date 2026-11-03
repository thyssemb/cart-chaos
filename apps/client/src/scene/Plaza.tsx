import { LOBBY_MODE, LOBBY_PROPS, LOBBY_SPOTS, type LobbyProp } from '@cart-chaos/shared'
import { NeighborhoodBus } from './Bus'
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
  const cafe = LOBBY_PROPS.find((prop) => prop.id === 'cafe')!
  return (
    <group>
      <SunsetSky />
      <Ground />
      <Hills />
      <NeighborhoodBus />
      {LOBBY_PROPS.map((prop) => (
        <Prop key={prop.id} prop={prop} />
      ))}
      <ReadyBoard />
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 2]} receiveShadow>
        <planeGeometry args={[64, 48]} />
        <meshStandardMaterial color="#6fbf6a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 8.45]} receiveShadow>
        <planeGeometry args={[54, 4.5]} />
        <meshStandardMaterial color="#5c6472" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 5.35]} receiveShadow>
        <planeGeometry args={[52, 1.55]} />
        <meshStandardMaterial color="#e7d3b4" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 11.55]} receiveShadow>
        <planeGeometry args={[50, 1.45]} />
        <meshStandardMaterial color="#ead4b2" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-14.4, -0.028, 1]} receiveShadow>
        <planeGeometry args={[4.2, 30]} />
        <meshStandardMaterial color="#6a7280" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[16.2, -0.028, -1]} receiveShadow>
        <planeGeometry args={[3.8, 22]} />
        <meshStandardMaterial color="#6a7280" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -1.2]} receiveShadow>
        <circleGeometry args={[6.6, 40]} />
        <meshStandardMaterial color="#f3d2a2" />
      </mesh>
      {[-16, -8, 0, 8, 16].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.02, 8.45]}>
          <planeGeometry args={[1.4, 0.12]} />
          <meshBasicMaterial color="#ffe14a" />
        </mesh>
      ))}
    </group>
  )
}

function Hills() {
  const hills = [
    [-34, 16, 9, 3.4],
    [-18, 26, 10, 3],
    [2, 27, 12, 3.3],
    [22, 25, 9, 2.8],
    [36, 6, 8, 3],
    [34, -10, 7, 2.5],
    [-36, -4, 8, 2.8],
    [-16, -24, 10, 2.6],
    [8, -24, 11, 2.7],
    [28, -20, 8, 2.3],
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
  if (prop.kind === 'house') return <House prop={prop} />
  if (prop.kind === 'shop') return <Shop prop={prop} />
  if (prop.kind === 'bakery') return <Bakery prop={prop} />
  if (prop.kind === 'stall') return <Stall prop={prop} />
  if (prop.kind === 'bench') return <Bench prop={prop} />
  if (prop.kind === 'vend') return <Vendor prop={prop} />
  if (prop.kind === 'hedge') return <Hedge prop={prop} />
  if (prop.kind === 'palm') return <Palm prop={prop} />
  if (prop.kind === 'tree') return <Tree prop={prop} />
  if (prop.kind === 'lamp') return <Lamp prop={prop} />
  if (prop.kind === 'fountain') return <Fountain prop={prop} />
  if (prop.kind === 'shelter') return <Shelter prop={prop} />
  if (prop.kind === 'table') return <TerraceTable prop={prop} />
  if (prop.kind === 'sign') return prop.id === 'stop-board' ? null : <SignFrame prop={prop} />
  if (prop.kind === 'hoop') return <Hoop prop={prop} />
  if (prop.kind === 'stairs') return <Stairs prop={prop} />
  return <Planter prop={prop} />
}

function faceOffset(prop: LobbyProp, gap: number) {
  if (prop.face === 'e') return { x: prop.w / 2 + gap, z: 0, east: true }
  if (prop.face === 'w') return { x: -prop.w / 2 - gap, z: 0, east: true }
  if (prop.face === 'n') return { x: 0, z: prop.d / 2 + gap, east: false }
  return { x: 0, z: -prop.d / 2 - gap, east: false }
}

function House({ prop }: { prop: LobbyProp }) {
  const front = faceOffset(prop, 0.04)
  const span = front.east ? prop.d * 0.62 : prop.w * 0.62
  const windowArgs: [number, number, number] = front.east ? [0.08, 0.7, span] : [span, 0.7, 0.08]
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, prop.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[prop.w, prop.h, prop.d]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
      <mesh position={[0, prop.h + 0.18, 0]} castShadow>
        <boxGeometry args={[prop.w + 0.3, 0.28, prop.d + 0.3]} />
        <meshStandardMaterial color="#c96b5a" />
      </mesh>
      <mesh position={[front.x, 1.7, front.z]}>
        <boxGeometry args={windowArgs} />
        <meshStandardMaterial color="#1d2430" />
      </mesh>
      <mesh position={[front.x, 3.15, front.z]}>
        <boxGeometry args={front.east ? [0.08, 0.55, span * 0.7] : [span * 0.7, 0.55, 0.08]} />
        <meshStandardMaterial color="#9ad7ff" />
      </mesh>
    </group>
  )
}

function Shop({ prop }: { prop: LobbyProp }) {
  const front = faceOffset(prop, 0.05)
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, prop.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[prop.w, prop.h, prop.d]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
      <mesh position={[front.x, 1.6, front.z]}>
        <boxGeometry args={[prop.w * 0.7, 1.1, 0.08]} />
        <meshStandardMaterial color="#14323c" />
      </mesh>
      <mesh position={[front.x, 2.55, front.z - 0.7]} castShadow>
        <boxGeometry args={[prop.w * 0.9, 0.08, 1.5]} />
        <meshStandardMaterial color="#fff6df" />
      </mesh>
      <mesh position={[front.x, 2.55, front.z - 1.15]}>
        <boxGeometry args={[prop.w * 0.9, 0.08, 0.28]} />
        <meshStandardMaterial color="#ff5d6c" />
      </mesh>
    </group>
  )
}

function Bakery({ prop }: { prop: LobbyProp }) {
  const front = faceOffset(prop, 0.05)
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, prop.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[prop.w, prop.h, prop.d]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
      <mesh position={[front.x, 1.45, front.z]}>
        <boxGeometry args={[0.08, 0.9, prop.d * 0.45]} />
        <meshStandardMaterial color="#ffd0a8" emissive="#ffb36b" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, prop.h + 0.16, 0]}>
        <boxGeometry args={[prop.w + 0.25, 0.22, prop.d + 0.2]} />
        <meshStandardMaterial color="#e07a5f" />
      </mesh>
    </group>
  )
}

function Tree({ prop }: { prop: LobbyProp }) {
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.8, 6]} />
        <meshStandardMaterial color="#8a5a32" />
      </mesh>
      <mesh position={[0, 2.15, 0]} castShadow>
        <sphereGeometry args={[0.85, 10, 8]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
    </group>
  )
}

function Lamp({ prop }: { prop: LobbyProp }) {
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 2.3, 6]} />
        <meshStandardMaterial color="#3d4654" />
      </mesh>
      <mesh position={[0, 2.35, 0]}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color={prop.color} emissive="#ffb703" emissiveIntensity={0.7} />
      </mesh>
    </group>
  )
}

function Fountain({ prop }: { prop: LobbyProp }) {
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, 0.28, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.85, 0.95, 0.5, 18]} />
        <meshStandardMaterial color="#d7e4ee" />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <cylinderGeometry args={[0.55, 0.6, 0.16, 16]} />
        <meshStandardMaterial color={prop.color} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.55, 8]} />
        <meshStandardMaterial color="#fff6df" />
      </mesh>
    </group>
  )
}

function Shelter({ prop }: { prop: LobbyProp }) {
  const sign = useMemo(() => makeSign('BUS', '#ffe14a', '#14323c'), [])
  useEffect(() => () => sign.dispose(), [sign])
  return (
    <group position={[prop.x, 0, prop.z]}>
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[prop.w, 0.08, prop.d]} />
        <meshStandardMaterial color="#ff8b78" />
      </mesh>
      {[-prop.w / 2 + 0.08, prop.w / 2 - 0.08].map((x) => (
        <mesh key={x} position={[x, 0.58, 0]}>
          <boxGeometry args={[0.08, 1.15, 0.08]} />
          <meshStandardMaterial color="#3d4654" />
        </mesh>
      ))}
      <mesh position={[0, 1.55, 0]}>
        <planeGeometry args={[0.7, 0.32]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
    </group>
  )
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

function ReadyBoard() {
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
  return (
    <group position={[6.15, 1.55, 4.5]}>
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
    <group position={[4.4, 0, 11.6]}>
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
    <group position={[11.2, 0.01, -8.4]}>
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
