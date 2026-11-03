import { SHELVES, CHECKOUTS } from '@cart-chaos/shared'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { makeSign, makeTiles } from './textures'

const goods = ['#ff5d6c', '#ffd23f', '#2ec4b6', '#4d96ff', '#ff8c42', '#d28bff', '#7bed9f', '#fff7ea', '#f08a5d', '#7ad0ff']

export function Supermarket({ physics = true }: { physics?: boolean }) {
  const tiles = useMemo(() => makeTiles(), [])
  const sign = useMemo(() => makeSign('SUPERMARKET', '#ff9f1c', '#fff8ea'), [])
  const deco = useMemo(() => buildDeco(), [])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 2]} receiveShadow>
        <planeGeometry args={[70, 56]} />
        <meshStandardMaterial color="#b7e39a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[34.4, 27]} />
        <meshStandardMaterial map={tiles} roughness={1} />
      </mesh>
      <Ceiling />
      <Walls sign={sign} />
      {SHELVES.map((shelf) => (
        <Shelf key={shelf.id} shelf={shelf} />
      ))}
      <Deco spots={deco} />
      {CHECKOUTS.map((zone) => (
        <mesh key={zone.id} rotation={[-Math.PI / 2, 0, 0]} position={[(zone.minX + zone.maxX) / 2, 0.02, (zone.minZ + zone.maxZ) / 2]}>
          <planeGeometry args={[zone.maxX - zone.minX, zone.maxZ - zone.minZ]} />
          <meshStandardMaterial color="#9ff3e6" transparent opacity={0.38} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[13.2, 0.03, -11.6]}>
        <planeGeometry args={[4.2, 2.2]} />
        <meshStandardMaterial color="#7dcea0" />
      </mesh>
      {physics &&
        SHELVES.map((shelf) => (
          <RigidBody key={`col-${shelf.id}`} type="fixed" position={[shelf.x, 1.2, shelf.z]} colliders={false}>
            <CuboidCollider args={[shelf.w / 2, 1.2, shelf.d / 2]} />
          </RigidBody>
        ))}
      <Trees />
    </group>
  )
}

function Ceiling() {
  const lights: [number, number][] = [
    [-10, 6],
    [0, 6],
    [10, 6],
    [-8, -2],
    [2, -2],
    [12, -2],
    [-6, -9],
    [4, -9],
  ]
  return (
    <group>
      <mesh position={[0, 4.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[34.2, 26.8]} />
        <meshStandardMaterial color="#fff8ec" />
      </mesh>
      {lights.map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 4.05, z]}>
          <boxGeometry args={[1.6, 0.08, 0.42]} />
          <meshStandardMaterial color="#fff4c8" emissive="#ffe7a3" emissiveIntensity={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function Walls({ sign }: { sign: THREE.Texture }) {
  const wall = '#fff3d4'
  const trim = '#d8f5df'
  return (
    <group>
      <mesh position={[0, 2, 13.45]} castShadow receiveShadow>
        <boxGeometry args={[34.6, 4.2, 0.35]} />
        <meshStandardMaterial color={wall} />
      </mesh>
      <mesh position={[-17.2, 2, 0]}>
        <boxGeometry args={[0.35, 4.2, 27.2]} />
        <meshStandardMaterial color={wall} />
      </mesh>
      <mesh position={[17.2, 2, 0]}>
        <boxGeometry args={[0.35, 4.2, 27.2]} />
        <meshStandardMaterial color="#ffe7a8" />
      </mesh>
      <mesh position={[-4, 0.4, -13.45]}>
        <boxGeometry args={[26, 0.8, 0.3]} />
        <meshStandardMaterial color={trim} />
      </mesh>
      <mesh position={[-4, 3.7, -13.45]}>
        <boxGeometry args={[26, 0.7, 0.3]} />
        <meshStandardMaterial color={wall} />
      </mesh>
      <mesh position={[-4, 2.05, -13.45]}>
        <planeGeometry args={[25.2, 2.5]} />
        <meshStandardMaterial color="#c9f4ff" transparent opacity={0.45} />
      </mesh>
      <mesh position={[13.4, 2, -13.5]}>
        <boxGeometry args={[0.18, 3.4, 0.2]} />
        <meshStandardMaterial color="#f7fff9" />
      </mesh>
      <mesh position={[11.15, 3.15, -13.15]}>
        <planeGeometry args={[4.6, 1.15]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      <Hanging text="FRUITS" position={[-11.6, 3.35, 7.6]} color="#9be38d" />
      <Hanging text="FRAIS" position={[-1, 3.35, 7.6]} color="#ffd0d0" />
      <Hanging text="SURGELÉS" position={[10.2, 3.35, 7.6]} color="#c7ecff" />
      <Hanging text="PROMO" position={[13.3, 3.35, -3.4]} color="#ffd23f" />
      <Poster text="2+1 BANANES" position={[-12.4, 2.35, 12.95]} rotation={[0, Math.PI, 0]} color="#ffd23f" />
      <Poster text="PROMO FOLLE" position={[16.7, 2.35, 6.2]} rotation={[0, -Math.PI / 2, 0]} color="#ff5d6c" />
      <Poster text="CAISSES" position={[-8.2, 2.7, -12.95]} rotation={[0, Math.PI, 0]} color="#2ec4b6" />
      <Poster text="PQ D'OR" position={[8.4, 2.55, 12.95]} rotation={[0, Math.PI, 0]} color="#ffe56b" />
    </group>
  )
}

function Poster({
  text,
  position,
  rotation,
  color,
}: {
  text: string
  position: [number, number, number]
  rotation: [number, number, number]
  color: string
}) {
  const map = useMemo(() => makeSign(text, color, '#243038'), [text, color])
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[1.7, 1.05, 0.06]} />
        <meshStandardMaterial color="#fff8ea" />
      </mesh>
      <mesh>
        <planeGeometry args={[1.5, 0.86]} />
        <meshBasicMaterial map={map} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Hanging({ text, position, color }: { text: string; position: [number, number, number]; color: string }) {
  const map = useMemo(() => makeSign(text, color, '#243038'), [text, color])
  return (
    <sprite position={position} scale={[2.3, 0.62, 1]}>
      <spriteMaterial map={map} transparent depthTest={false} />
    </sprite>
  )
}

function Shelf({ shelf }: { shelf: (typeof SHELVES)[number] }) {
  const label = useMemo(() => makeSign(shelf.label, shelf.trim, '#243038'), [shelf])
  if (shelf.kind === 'checkout') {
    return (
      <group position={[shelf.x, 0, shelf.z]}>
        <mesh position={[0, shelf.h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[shelf.w, shelf.h, shelf.d]} />
          <meshStandardMaterial color={shelf.color} />
        </mesh>
        <mesh position={[0, shelf.h + 0.04, 0.15]}>
          <boxGeometry args={[shelf.w * 0.86, 0.08, shelf.d * 0.55]} />
          <meshStandardMaterial color="#7fe3d6" />
        </mesh>
        <mesh position={[0, 0.72, -0.42]}>
          <boxGeometry args={[0.46, 0.32, 0.08]} />
          <meshStandardMaterial color="#243038" />
        </mesh>
        <mesh position={[0, 1.35, 0]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[1.5, 0.38]} />
          <meshBasicMaterial map={label} toneMapped={false} />
        </mesh>
      </group>
    )
  }
  const glass = shelf.kind === 'fridge' || shelf.kind === 'freezer'
  return (
    <group position={[shelf.x, 0, shelf.z]}>
      <mesh position={[0, shelf.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[shelf.w, shelf.h, shelf.d]} />
        <meshStandardMaterial color={shelf.color} />
      </mesh>
      <mesh position={[0, shelf.h + 0.04, 0]}>
        <boxGeometry args={[shelf.w + 0.08, 0.08, shelf.d + 0.08]} />
        <meshStandardMaterial color={shelf.trim} />
      </mesh>
      {glass && (
        <mesh position={[0, shelf.h * 0.55, -(shelf.d / 2 + 0.02)]}>
          <planeGeometry args={[shelf.w * 0.86, shelf.h * 0.62]} />
          <meshStandardMaterial color="#e9fbff" transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>
      )}
      {shelf.kind === 'gondola' && (
        <mesh position={[0, 0.85, 0]}>
          <boxGeometry args={[shelf.w + 0.05, 0.06, shelf.d * 0.92]} />
          <meshStandardMaterial color="#fff7ea" />
        </mesh>
      )}
      <sprite position={[0, shelf.h + 0.55, 0]} scale={[Math.min(2.4, shelf.w * 0.85), 0.46, 1]}>
        <spriteMaterial map={label} transparent depthTest={false} />
      </sprite>
    </group>
  )
}

function buildDeco() {
  const spots: { position: [number, number, number]; color: string; scale: [number, number, number] }[] = []
  SHELVES.forEach((shelf, shelfIndex) => {
    if (shelf.kind === 'checkout') return
    const alongZ = shelf.kind === 'gondola' || shelf.kind === 'promo'
    const count = alongZ ? 8 : 6
    const layers = shelf.kind === 'produce' ? [shelf.h + 0.22] : [0.48, Math.min(shelf.h - 0.28, 1.05)]
    const sides = alongZ ? ([-1, 1] as const) : ([-1] as const)
    sides.forEach((side, sideIndex) => {
      for (let i = 0; i < count; i += 1) {
        const u = (i + 0.5) / count - 0.5
        const y = layers[(i + sideIndex) % layers.length]!
        const position: [number, number, number] = alongZ
          ? [shelf.x + side * (shelf.w / 2 + 0.16), y, shelf.z + u * shelf.d * 0.82]
          : [shelf.x + u * shelf.w * 0.78, y, shelf.z - shelf.d / 2 - 0.16]
        const tall = (i + shelfIndex) % 3 === 0
        spots.push({
          position,
          color: goods[(i + shelfIndex + sideIndex) % goods.length]!,
          scale: tall ? [0.22, 0.42, 0.18] : [0.3, 0.26, 0.2],
        })
      }
    })
  })
  return spots
}

function Deco({ spots }: { spots: { position: [number, number, number]; color: string; scale: [number, number, number] }[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    spots.forEach((spot, index) => {
      dummy.position.set(spot.position[0], spot.position[1], spot.position[2])
      dummy.scale.set(spot.scale[0], spot.scale[1], spot.scale[2])
      dummy.rotation.y = (index % 5) * 0.15
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
      mesh.setColorAt(index, new THREE.Color(spot.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [spots])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, spots.length]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.7} />
    </instancedMesh>
  )
}

function Trees() {
  const spots: [number, number][] = [
    [-20, 8],
    [-20, -2],
    [20.5, 6],
    [20.5, -6],
    [8, 16],
    [-8, 16],
  ]
  return (
    <group>
      {spots.map(([x, z]) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 0.9, 6]} />
            <meshStandardMaterial color="#c68642" />
          </mesh>
          <mesh position={[0, 1.25, 0]}>
            <sphereGeometry args={[0.55, 10, 8]} />
            <meshStandardMaterial color="#67c15b" />
          </mesh>
        </group>
      ))}
    </group>
  )
}
