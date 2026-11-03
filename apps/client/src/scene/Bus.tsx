import { BUS_HOME, BUS_SEATS } from '@cart-chaos/shared'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGame } from '../store'
import { makeSign } from './textures'

const cream = '#f6f0e4'
const stripe = '#ff6b6b'
const skirt = '#2c3340'
const glass = '#243044'

/**
 * Bus cartoon original. L'archive fournie était un conteneur GTA (RSC7),
 * pas un GLB : elle n'est pas chargée ici.
 */
export function NeighborhoodBus() {
  const bus = useGame((state) => state.room?.bus)
  const pose = bus ?? { x: BUS_HOME.x, z: BUS_HOME.z, yaw: BUS_HOME.yaw, door: 1, rolling: false }
  const wheels = useRef<Array<THREE.Mesh | null>>([])
  const spin = useRef(0)
  const dest = useMemo(() => makeSign('SUPERMARCHÉ', '#ffd56a', '#14323c'), [])
  useEffect(() => () => dest.dispose(), [dest])
  useFrame((_, delta) => {
    if (!useGame.getState().room?.bus.rolling) return
    spin.current += delta * 9
    for (const wheel of wheels.current) {
      if (wheel) wheel.rotation.y = spin.current
    }
  })
  const door = pose.door
  return (
    <group position={[pose.x, 0, pose.z]} rotation={[0, pose.yaw, 0]}>
      <mesh position={[0, 0.22, 0]} receiveShadow>
        <boxGeometry args={[8.7, 0.12, 2.05]} />
        <meshStandardMaterial color="#d7c3a4" />
      </mesh>
      <mesh position={[0, 0.78, 1.1]} castShadow>
        <boxGeometry args={[9, 1.15, 0.12]} />
        <meshStandardMaterial color={skirt} />
      </mesh>
      <mesh position={[-1.5, 0.78, -1.1]} castShadow>
        <boxGeometry args={[6, 1.15, 0.12]} />
        <meshStandardMaterial color={skirt} />
      </mesh>
      <mesh position={[3.7, 0.78, -1.1]} castShadow>
        <boxGeometry args={[1.6, 1.15, 0.12]} />
        <meshStandardMaterial color={skirt} />
      </mesh>
      <mesh position={[0, 1.62, 1.12]}>
        <boxGeometry args={[8.5, 0.82, 0.06]} />
        <meshStandardMaterial color={glass} transparent opacity={0.38} roughness={0.15} depthWrite={false} />
      </mesh>
      <mesh position={[-1.5, 1.62, -1.12]}>
        <boxGeometry args={[5.6, 0.82, 0.06]} />
        <meshStandardMaterial color={glass} transparent opacity={0.38} roughness={0.15} depthWrite={false} />
      </mesh>
      <mesh position={[4.48, 1.28, 0]} castShadow>
        <boxGeometry args={[0.28, 2.05, 2.22]} />
        <meshStandardMaterial color={cream} />
      </mesh>
      <mesh position={[-4.48, 1.28, 0]} castShadow>
        <boxGeometry args={[0.28, 2.05, 2.22]} />
        <meshStandardMaterial color={cream} />
      </mesh>
      <mesh position={[0, 2.38, 0]} castShadow>
        <boxGeometry args={[9.05, 0.22, 2.4]} />
        <meshStandardMaterial color={cream} />
      </mesh>
      <mesh position={[0, 1.22, 1.18]}>
        <boxGeometry args={[8.6, 0.18, 0.08]} />
        <meshStandardMaterial color={stripe} />
      </mesh>
      <mesh position={[-1.5, 1.22, -1.18]}>
        <boxGeometry args={[5.7, 0.18, 0.08]} />
        <meshStandardMaterial color={stripe} />
      </mesh>
      <mesh position={[3.7, 1.22, -1.18]}>
        <boxGeometry args={[1.5, 0.18, 0.08]} />
        <meshStandardMaterial color={stripe} />
      </mesh>
      <mesh position={[0, 2.28, 0]}>
        <boxGeometry args={[8.9, 0.08, 2.36]} />
        <meshStandardMaterial color="#ffe14a" emissive="#ffcc4d" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[1.86 - door * 0.55, 1.15, -1.2]} castShadow>
        <boxGeometry args={[0.62, 1.7, 0.08]} />
        <meshStandardMaterial color={cream} />
      </mesh>
      <mesh position={[2.54 + door * 0.55, 1.15, -1.2]} castShadow>
        <boxGeometry args={[0.62, 1.7, 0.08]} />
        <meshStandardMaterial color={cream} />
      </mesh>
      {BUS_SEATS.map((seat, index) => (
        <mesh key={`${seat.x}-${seat.z}`} position={[seat.x, 0.4, seat.z]} castShadow>
          <boxGeometry args={[0.46, 0.12, 0.42]} />
          <meshStandardMaterial color={index % 2 === 0 ? '#ff8b78' : '#8ec5ff'} />
        </mesh>
      ))}
      {[-3.15, -1.15, 1.35, 3.15].map((x, index) =>
        [-0.95, 0.95].map((z) => (
          <group key={`${x}-${z}`} position={[x, 0.38, z]} rotation={[0, 0, Math.PI / 2]}>
            <mesh
              ref={(node) => {
                wheels.current[index * 2 + (z > 0 ? 1 : 0)] = node
              }}
            >
              <cylinderGeometry args={[0.36, 0.36, 0.24, 12]} />
              <meshStandardMaterial color="#1c1f27" />
            </mesh>
          </group>
        )),
      )}
      <mesh position={[4.62, 0.85, 0.55]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color="#fff6df" emissive="#ffe7a3" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[4.62, 0.85, -0.55]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color="#fff6df" emissive="#ffe7a3" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-1.5, 2.15, -1.22]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2.4, 0.42]} />
        <meshBasicMaterial map={dest} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.2, 0.05, -1.78]}>
        <ringGeometry args={[0.42, 0.58, 22]} />
        <meshBasicMaterial color="#ffe14a" />
      </mesh>
    </group>
  )
}
