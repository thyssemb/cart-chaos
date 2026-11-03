import { CHECKOUTS, HOMES, SHELF_INSET, SHELF_TOPS, SHELVES } from '@cart-chaos/shared'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useMemo } from 'react'
import type { Texture } from 'three'
import { ShelfStock } from './shelfStock'
import { makePrice, makeSign, makeTiles } from './textures'

export function Supermarket({ physics = true }: { physics?: boolean }) {
  const tiles = useMemo(() => makeTiles(), [])
  const sign = useMemo(() => makeSign('SUPERMARKET', '#ff9f1c', '#fff8ea'), [])
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
      <ShelfStock />
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

function Walls({ sign }: { sign: Texture }) {
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

const PRICES: Record<string, string> = {
  fruits: '1,20 €',
  frais: '2,40 €',
  frozen: '3,10 €',
  r1: '1,50 €',
  r2: '1,80 €',
  r3: '2,90 €',
  r4: '1,10 €',
  promo: '0,99 €',
}

function postStops(length: number, step: number) {
  const stops = [-length / 2 + 0.05]
  let cursor = stops[0]! + step
  while (cursor < length / 2 - step * 0.55) {
    stops.push(Number(cursor.toFixed(3)))
    cursor += step
  }
  stops.push(length / 2 - 0.05)
  return stops
}

function Shelf({ shelf }: { shelf: (typeof SHELVES)[number] }) {
  const label = useMemo(() => makeSign(shelf.label, shelf.trim, '#243038'), [shelf])
  const price = useMemo(() => makePrice(PRICES[shelf.id] ?? '1,50 €'), [shelf.id])
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

  const { w, d } = shelf
  const alongZ = shelf.kind === 'gondola' || shelf.kind === 'promo'
  const double = shelf.kind === 'gondola'
  const frame = '#d7e0e8'
  const board = '#fff6e8'
  const long = alongZ ? d : w
  const count = alongZ ? 9 : 8
  const cuts = Array.from({ length: count - 1 }, (_, index) => ((index + 1) / count - 0.5) * long).filter((along) =>
    HOMES.every((home) => {
      if (Math.abs(home.x - shelf.x) > w / 2 || Math.abs(home.z - shelf.z) > d / 2) return true
      const homeAlong = alongZ ? home.z - shelf.z : home.x - shelf.x
      return Math.abs(homeAlong - along) >= 0.36
    }),
  )
  const faces: Array<'s' | 'e' | 'w'> = alongZ ? (shelf.kind === 'promo' ? ['w'] : ['e', 'w']) : ['s']
  const xPosts = alongZ ? [-w / 2 + 0.05, w / 2 - 0.05] : postStops(w, 1.65).filter((value) => Math.abs(value) < w / 2 - 0.2)
  const zPosts = alongZ ? postStops(d, 1.7).filter((value) => Math.abs(value) < d / 2 - 0.2) : [-d / 2 + 0.05, d / 2 - 0.05]
  const tagAlong = [-2.5, 0, 2.5].filter((value) => Math.abs(value) < long / 2 - 0.5)

  return (
    <group position={[shelf.x, 0, shelf.z]}>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[w, 0.16, d]} />
        <meshStandardMaterial color={shelf.trim} />
      </mesh>
      {[
        [-w / 2 + 0.05, -d / 2 + 0.05],
        [w / 2 - 0.05, -d / 2 + 0.05],
        [-w / 2 + 0.05, d / 2 - 0.05],
        [w / 2 - 0.05, d / 2 - 0.05],
      ].map(([x, z]) => (
        <mesh key={`corner-${x}-${z}`} position={[x, 1.16, z]} castShadow>
          <boxGeometry args={[0.08, 2.24, 0.08]} />
          <meshStandardMaterial color={shelf.trim} />
        </mesh>
      ))}
      {xPosts.flatMap((x) =>
        zPosts.map((z) => (
          <mesh key={`post-${x}-${z}`} position={[x, 1.16, z]} castShadow>
            <boxGeometry args={[0.07, 2.24, 0.07]} />
            <meshStandardMaterial color={shelf.trim} />
          </mesh>
        )),
      )}
      {double ? (
        <mesh position={[0, 1.16, 0]} receiveShadow>
          <boxGeometry args={[0.06, 2.16, d - 0.18]} />
          <meshStandardMaterial color={shelf.color} />
        </mesh>
      ) : alongZ ? (
        <mesh position={[w / 2 - 0.06, 1.16, 0]} receiveShadow>
          <boxGeometry args={[0.06, 2.16, d - 0.16]} />
          <meshStandardMaterial color={shelf.color} />
        </mesh>
      ) : (
        <mesh position={[0, 1.16, d / 2 - 0.06]} receiveShadow>
          <boxGeometry args={[w - 0.16, 2.16, 0.06]} />
          <meshStandardMaterial color={shelf.color} />
        </mesh>
      )}
      {SHELF_TOPS.map((top) => {
        const y = top - 0.03
        if (double) {
          return (
            <group key={`board-${top}`}>
              <mesh position={[w / 4, y, 0]} castShadow receiveShadow>
                <boxGeometry args={[w / 2 - 0.1, 0.06, d - 0.22]} />
                <meshStandardMaterial color={board} />
              </mesh>
              <mesh position={[-w / 4, y, 0]} castShadow receiveShadow>
                <boxGeometry args={[w / 2 - 0.1, 0.06, d - 0.22]} />
                <meshStandardMaterial color={board} />
              </mesh>
            </group>
          )
        }
        if (alongZ) {
          return (
            <mesh key={`board-${top}`} position={[-0.03, y, 0]} castShadow receiveShadow>
              <boxGeometry args={[w - 0.16, 0.06, d - 0.22]} />
              <meshStandardMaterial color={board} />
            </mesh>
          )
        }
        return (
          <mesh key={`board-${top}`} position={[0, y, -0.04]} castShadow receiveShadow>
            <boxGeometry args={[w - 0.14, 0.06, d - 0.18]} />
            <meshStandardMaterial color={board} />
          </mesh>
        )
      })}
      {faces.flatMap((face) =>
        SHELF_TOPS.flatMap((top, level) => {
          const next = SHELF_TOPS[level + 1]
          const height = (next ?? top + 0.34) - top - 0.08
          const y = top + height / 2
          return cuts.map((along) => {
            const position: [number, number, number] =
              face === 's' ? [along, y, -d / 2 + SHELF_INSET] : face === 'e' ? [w / 2 - SHELF_INSET, y, along] : [-w / 2 + SHELF_INSET, y, along]
            const size: [number, number, number] = face === 's' ? [0.03, height, 0.16] : [0.16, height, 0.03]
            return (
              <mesh key={`div-${face}-${top}-${along}`} position={position}>
                <boxGeometry args={size} />
                <meshStandardMaterial color={frame} />
              </mesh>
            )
          })
        }),
      )}
      {topTags(faces, tagAlong, w, d).map((tag) => (
        <mesh key={tag.key} position={tag.position} rotation={tag.rotation}>
          <planeGeometry args={[0.42, 0.16]} />
          <meshBasicMaterial map={price} toneMapped={false} />
        </mesh>
      ))}
      {headerSpots(alongZ, double, w, d).map((spot) => (
        <group key={spot.key} position={spot.position} rotation={spot.rotation}>
          <mesh position={[0, 0, -0.03]}>
            <boxGeometry args={[1.7, 0.42, 0.06]} />
            <meshStandardMaterial color={shelf.trim} />
          </mesh>
          <mesh>
            <planeGeometry args={[1.5, 0.3]} />
            <meshBasicMaterial map={label} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function topTags(faces: Array<'s' | 'e' | 'w'>, along: number[], w: number, d: number) {
  const tags: { key: string; position: [number, number, number]; rotation: [number, number, number] }[] = []
  for (const face of faces) {
    for (const top of [SHELF_TOPS[0], SHELF_TOPS[1]]) {
      for (const value of along) {
        const y = top - 0.16
        if (face === 's') tags.push({ key: `${face}-${top}-${value}`, position: [value, y, -d / 2 + 0.02], rotation: [0, Math.PI, 0] })
        if (face === 'e') tags.push({ key: `${face}-${top}-${value}`, position: [w / 2 - 0.02, y, value], rotation: [0, -Math.PI / 2, 0] })
        if (face === 'w') tags.push({ key: `${face}-${top}-${value}`, position: [-w / 2 + 0.02, y, value], rotation: [0, Math.PI / 2, 0] })
      }
    }
  }
  return tags
}

function headerSpots(alongZ: boolean, double: boolean, w: number, d: number) {
  const y = 2.42
  if (!alongZ) {
    return [{ key: 's', position: [0, y, -d / 2 + 0.12] as [number, number, number], rotation: [0, Math.PI, 0] as [number, number, number] }]
  }
  const places = [-2.3, 2.3].filter((value) => Math.abs(value) < d / 2 - 0.9)
  const faces: Array<'e' | 'w'> = double ? ['e', 'w'] : ['w']
  return faces.flatMap((face) =>
    places.map((z) => ({
      key: `${face}-${z}`,
      position: [face === 'e' ? w / 2 - 0.08 : -w / 2 + 0.08, y, z] as [number, number, number],
      rotation: [0, face === 'e' ? -Math.PI / 2 : Math.PI / 2, 0] as [number, number, number],
    })),
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
