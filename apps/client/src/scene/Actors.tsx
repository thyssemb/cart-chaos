import { CATALOG, colorById, type ProductType } from '@cart-chaos/shared'
import { useMemo, useRef } from 'react'
import type { Group, Mesh } from 'three'
import { useFrame } from '@react-three/fiber'
import { useGame } from '../store'
import { makeBasket, makeFace, makeLabel, makeOveralls } from './textures'
import { views } from '../views'

const idle: (typeof views.players extends Map<string, infer V> ? V : never) = {
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
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

export function Actors() {
  const playerIds = useGame((state) => state.playerIds)
  const productIds = useGame((state) => state.productIds)
  const cartIds = useGame((state) => state.cartIds)
  return (
    <group>
      {cartIds.map((id) => (
        <CartModel key={id} id={id} />
      ))}
      {playerIds.map((id) => (
        <CharacterModel key={id} id={id} />
      ))}
      {productIds.map((id) => (
        <ProductModel key={id} id={id} />
      ))}
      <LegendaryBeacon />
    </group>
  )
}

export function DemoCrew() {
  const rig = useRef<Group>(null)
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime
    const x = Math.sin(t * 0.45) * 3.4
    const dir = Math.cos(t * 0.45) >= 0 ? 1 : -1
    const yaw = dir > 0 ? Math.PI / 2 : -Math.PI / 2
    views.players.set('demo', {
      ...idle,
      x,
      z: -1.4,
      yaw,
      speed: 3.1,
      holding: true,
      connected: true,
    })
    views.carts.set('demo', {
      x: x + Math.sin(yaw) * 1.08,
      z: -1.4 + Math.cos(yaw) * 1.08,
      yaw,
      held: true,
      count: 3,
    })
    const orbit = t * 0.13
    camera.position.set(Math.sin(orbit) * 17, 11.5, Math.cos(orbit) * 15)
    camera.lookAt(0, 1, 1)
    if (rig.current) rig.current.rotation.y = Math.sin(t * 0.4) * 0.02
  })
  return (
    <group ref={rig}>
      <CartModel id="demo" colorId="rose" />
      <CharacterModel id="demo" colorId="rose" name="Lina" />
    </group>
  )
}

export function CharacterModel({ id, colorId, name }: { id: string; colorId?: string; name?: string }) {
  const group = useRef<Group>(null)
  const legL = useRef<Group>(null)
  const legR = useRef<Group>(null)
  const armL = useRef<Group>(null)
  const armR = useRef<Group>(null)
  const phase = useRef(0)
  const swing = useRef(0)
  const arms = useRef(0)
  const lean = useRef(0)
  const squash = useRef(1)
  const land = useRef(0)
  const prevGround = useRef(true)
  const prevYaw = useRef(0)
  const gait = useRef(0)
  const storeColor = useGame((state) => state.room?.players.find((player) => player.id === id)?.colorId)
  const storeName = useGame((state) => state.room?.players.find((player) => player.id === id)?.name)
  const palette = colorById(colorId ?? storeColor ?? 'coral')
  const overalls = useMemo(() => makeOveralls(), [])
  const face = useMemo(() => makeFace(false), [])
  const hurt = useMemo(() => makeFace(true), [])
  const label = useMemo(() => makeLabel(name ?? storeName ?? '', '#fff6df'), [name, storeName])

  useFrame((_, dt) => {
    const pose = views.players.get(id)
    if (!group.current || !pose) return
    group.current.visible = pose.connected
    const grounded = pose.grounded && pose.y < 0.08
    if (prevGround.current && !grounded) land.current = 0
    if (!prevGround.current && grounded) land.current = 0.18
    prevGround.current = grounded
    land.current = Math.max(0, land.current - dt)
    const speed = pose.speed
    const running = speed > 9.4
    const pushing = pose.holding
    const along = pose.vx * Math.sin(pose.yaw) + pose.vz * Math.cos(pose.yaw)
    const backward = grounded && !pose.celebrate && speed > 0.55 ? Math.max(0, Math.min(1, (-along / speed - 0.2) / 0.55)) : 0
    gait.current += (backward - gait.current) * (1 - Math.exp(-8 * dt))
    const retreat = gait.current
    if (grounded && speed > 0.45) {
      const cadence = pose.celebrate ? 8 : (1.6 + speed * 0.85) * (1 - retreat) + (2.15 + speed * 0.45) * retreat
      phase.current += dt * cadence
    }
    const blend = 1 - Math.exp(-11 * dt)
    const targetSwing = grounded && speed > 0.3 && !pose.celebrate ? Math.sin(phase.current) * (running ? 0.9 : 0.55) * (1 - retreat * 0.35) : 0
    swing.current += (targetSwing - swing.current) * blend
    let armTarget = -swing.current
    if (!grounded) armTarget = pose.y > 0.2 ? -0.85 : 0.35
    if (pushing) armTarget = -1.02
    if (pose.carrying && !pushing) armTarget = -1.15
    if (grounded && !pushing && !pose.carrying && !pose.celebrate && retreat > 0.02) {
      const backArm = -0.42 + Math.sin(phase.current * 1.15 + 0.7) * 0.1
      armTarget = armTarget * (1 - retreat) + backArm * retreat
    }
    arms.current += (armTarget - arms.current) * blend
    let yawDelta = pose.yaw - prevYaw.current
    while (yawDelta > Math.PI) yawDelta -= Math.PI * 2
    while (yawDelta < -Math.PI) yawDelta += Math.PI * 2
    prevYaw.current = pose.yaw
    const leanTarget = Math.max(-0.22, Math.min(0.22, (-yawDelta / Math.max(dt, 0.016)) * 0.045))
    lean.current += (leanTarget - lean.current) * blend
    const bob = grounded && speed > 0.45 ? Math.abs(Math.sin(phase.current)) * (running ? 0.075 : 0.04) * (1 - retreat * 0.45) : pose.celebrate ? Math.abs(Math.sin(phase.current)) * 0.16 : 0
    const squashTarget = pose.hit ? 0.76 : land.current > 0 ? 0.84 : 1
    squash.current += (squashTarget - squash.current) * blend
    group.current.position.set(pose.x, pose.y + bob, pose.z)
    group.current.rotation.y = pose.yaw
    group.current.rotation.x = -retreat * 0.16
    group.current.rotation.z = pushing ? lean.current * 0.45 : lean.current
    group.current.scale.set(pose.hit ? 1.12 : 1, squash.current, pose.hit ? 1.12 : 1)
    if (legL.current && legR.current) {
      if (!grounded) {
        const rising = pose.y > 0.12
        legL.current.rotation.x = rising ? -0.95 : 0.2
        legR.current.rotation.x = rising ? -0.45 : -0.15
      } else if (pose.celebrate) {
        legL.current.rotation.x = -0.45
        legR.current.rotation.x = -0.15
      } else {
        const stepBack = Math.sin(phase.current * 1.2)
        legL.current.rotation.x = swing.current * (1 - retreat) + (-0.36 + stepBack * 0.16) * retreat
        legR.current.rotation.x = -swing.current * (1 - retreat) + (-0.36 - stepBack * 0.16) * retreat
      }
    }
    if (armL.current) {
      armL.current.rotation.x = pushing || !pose.carrying ? arms.current : -0.35
      armL.current.position.z = pushing ? 0.08 : pose.carrying ? 0.08 : 0
    }
    if (armR.current) {
      armR.current.rotation.x = pushing ? arms.current : pose.carrying ? -1.2 : -arms.current
      armR.current.position.z = pushing ? 0.08 : pose.carrying ? 0.32 : 0
    }
    const faceMesh = group.current.getObjectByName('face') as Mesh | undefined
    if (faceMesh && Array.isArray(faceMesh.material) === false) {
      const material = faceMesh.material as { map?: unknown }
      material.map = pose.hit ? hurt : face
    }
  })

  return (
    <group ref={group}>
      <group ref={legL} position={[-0.14, 0.46, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <boxGeometry args={[0.16, 0.46, 0.18]} />
          <meshStandardMaterial color={palette.skin} />
        </mesh>
        <mesh position={[0, -0.46, 0.04]}>
          <boxGeometry args={[0.18, 0.1, 0.28]} />
          <meshStandardMaterial color="#2b3038" />
        </mesh>
      </group>
      <group ref={legR} position={[0.14, 0.46, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <boxGeometry args={[0.16, 0.46, 0.18]} />
          <meshStandardMaterial color={palette.skin} />
        </mesh>
        <mesh position={[0, -0.46, 0.04]}>
          <boxGeometry args={[0.18, 0.1, 0.28]} />
          <meshStandardMaterial color="#2b3038" />
        </mesh>
      </group>
      <mesh position={[0, 0.92, 0]} castShadow>
        <boxGeometry args={[0.58, 0.5, 0.34]} />
        <meshStandardMaterial map={overalls} />
      </mesh>
      <mesh position={[0, 1.05, 0.13]}>
        <boxGeometry args={[0.28, 0.22, 0.06]} />
        <meshStandardMaterial color="#f7fbff" />
      </mesh>
      <mesh position={[-0.1, 0.8, 0.17]}>
        <cylinderGeometry args={[0.045, 0.045, 0.04, 6]} />
        <meshStandardMaterial color="#e2b15a" />
      </mesh>
      <mesh position={[0.1, 0.8, 0.17]}>
        <cylinderGeometry args={[0.045, 0.045, 0.04, 6]} />
        <meshStandardMaterial color="#e2b15a" />
      </mesh>
      <mesh position={[0, 1.58, 0]} castShadow>
        <boxGeometry args={[0.86, 0.7, 0.72]} />
        <meshStandardMaterial color={palette.skin} />
      </mesh>
      <mesh name="face" position={[0, 1.56, 0.37]}>
        <planeGeometry args={[0.62, 0.5]} />
        <meshBasicMaterial map={face} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.98, -0.02]} castShadow>
        <boxGeometry args={[0.92, 0.28, 0.78]} />
        <meshStandardMaterial color={palette.hair} />
      </mesh>
      <mesh position={[-0.44, 1.62, -0.02]}>
        <boxGeometry args={[0.16, 0.5, 0.74]} />
        <meshStandardMaterial color={palette.hair} />
      </mesh>
      <mesh position={[0.44, 1.62, -0.02]}>
        <boxGeometry args={[0.16, 0.5, 0.74]} />
        <meshStandardMaterial color={palette.hair} />
      </mesh>
      <mesh position={[0, 1.6, -0.34]}>
        <boxGeometry args={[0.86, 0.56, 0.14]} />
        <meshStandardMaterial color={palette.hair} />
      </mesh>
      <group ref={armL} position={[-0.42, 1.14, 0]}>
        <mesh position={[0, -0.2, 0.04]} castShadow>
          <boxGeometry args={[0.16, 0.42, 0.16]} />
          <meshStandardMaterial color={palette.skin} />
        </mesh>
        <mesh position={[0, -0.46, 0.08]} castShadow>
          <boxGeometry args={[0.2, 0.18, 0.2]} />
          <meshStandardMaterial color={palette.skin} />
        </mesh>
      </group>
      <group ref={armR} position={[0.42, 1.14, 0]}>
        <mesh position={[0, -0.2, 0.04]} castShadow>
          <boxGeometry args={[0.16, 0.42, 0.16]} />
          <meshStandardMaterial color={palette.skin} />
        </mesh>
        <mesh position={[0, -0.46, 0.08]} castShadow>
          <boxGeometry args={[0.2, 0.18, 0.2]} />
          <meshStandardMaterial color={palette.skin} />
        </mesh>
      </group>
      <sprite position={[0, 2.35, 0]} scale={[1.5, 0.38, 1]}>
        <spriteMaterial map={label} transparent depthTest={false} />
      </sprite>
    </group>
  )
}

export function CartModel({ id, colorId }: { id: string; colorId?: string }) {
  const group = useRef<Group>(null)
  const wheels = useRef<Group>(null)
  const spin = useRef(0)
  const prevYaw = useRef(0)
  const tilt = useRef(0)
  const basket = useMemo(() => makeBasket(), [])
  const storeColor = useGame((state) => state.room?.players.find((player) => player.id === id)?.colorId)
  const palette = colorById(colorId ?? storeColor ?? 'coral')
  useFrame((_, dt) => {
    const pose = views.carts.get(id)
    if (!pose || !group.current) return
    let delta = pose.yaw - prevYaw.current
    while (delta > Math.PI) delta -= Math.PI * 2
    while (delta < -Math.PI) delta += Math.PI * 2
    prevYaw.current = pose.yaw
    const targetTilt = pose.held ? Math.max(-0.18, Math.min(0.18, -delta / Math.max(dt, 0.016) * 0.05)) : 0
    tilt.current += (targetTilt - tilt.current) * (1 - Math.exp(-8 * dt))
    group.current.position.set(pose.x, 0, pose.z)
    group.current.rotation.y = pose.yaw
    group.current.rotation.z = tilt.current
    spin.current += dt * (pose.held ? 8 : 0)
    if (wheels.current) {
      for (const child of wheels.current.children) child.rotation.x = spin.current
    }
  })
  return (
    <group ref={group}>
      <group ref={wheels}>
        {[
          [-0.28, 0.1, 0.32],
          [0.28, 0.1, 0.32],
          [-0.28, 0.1, -0.28],
          [0.28, 0.1, -0.28],
        ].map((position) => (
          <mesh key={position.join()} position={position as [number, number, number]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.06, 10]} />
            <meshStandardMaterial color="#2b3038" />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0.22, 0.05]}>
        <boxGeometry args={[0.62, 0.05, 0.78]} />
        <meshStandardMaterial color="#c5ced6" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <boxGeometry args={[0.7, 0.36, 0.86]} />
        <meshStandardMaterial map={basket} transparent metalness={0.45} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.78, -0.46]}>
        <boxGeometry args={[0.46, 0.08, 0.08]} />
        <meshStandardMaterial color="#e23b3b" />
      </mesh>
      <mesh position={[-0.22, 0.62, -0.42]}>
        <boxGeometry args={[0.05, 0.34, 0.05]} />
        <meshStandardMaterial color="#d5dee6" metalness={0.5} />
      </mesh>
      <mesh position={[0.22, 0.62, -0.42]}>
        <boxGeometry args={[0.05, 0.34, 0.05]} />
        <meshStandardMaterial color="#d5dee6" metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.34, 0.46]}>
        <boxGeometry args={[0.5, 0.08, 0.08]} />
        <meshStandardMaterial color={palette.hex} />
      </mesh>
    </group>
  )
}

function ProductModel({ id }: { id: string }) {
  const group = useRef<Group>(null)
  const type = useGame((state) => state.room?.products.find((product) => product.id === id)?.type)
  useFrame(() => {
    const pose = views.products.get(id)
    if (!group.current || !pose) return
    group.current.visible = pose.visible
    group.current.position.set(pose.x, pose.y, pose.z)
    group.current.rotation.y = pose.yaw
  })
  if (!type) return null
  return (
    <group ref={group}>
      <ProductShape type={type} />
    </group>
  )
}

function ProductShape({ type }: { type: ProductType }) {
  const def = CATALOG[type]
  if (type === 'drink') {
    return (
      <mesh castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.28, 10]} />
        <meshStandardMaterial color={def.color} />
      </mesh>
    )
  }
  if (type === 'toilet' || type === 'legendary') {
    return (
      <group>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 0.28, 12]} />
          <meshStandardMaterial color={def.color} emissive={type === 'legendary' ? '#ffd700' : '#000'} emissiveIntensity={type === 'legendary' ? 0.7 : 0} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
          <meshStandardMaterial color={def.accent} />
        </mesh>
      </group>
    )
  }
  if (type === 'banana') {
    return (
      <mesh castShadow rotation={[0.4, 0.2, 0.8]}>
        <capsuleGeometry args={[0.06, 0.16, 4, 8]} />
        <meshStandardMaterial color={def.color} />
      </mesh>
    )
  }
  const tall = type === 'cereal' || type === 'milk'
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[tall ? 0.18 : 0.24, tall ? 0.32 : 0.2, 0.16]} />
        <meshStandardMaterial color={def.color} />
      </mesh>
      <mesh position={[0, 0, 0.082]}>
        <boxGeometry args={[tall ? 0.12 : 0.16, 0.06, 0.01]} />
        <meshStandardMaterial color={def.accent} />
      </mesh>
    </group>
  )
}

function LegendaryBeacon() {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    let found: { x: number; y: number; z: number } | null = null
    for (const pose of views.products.values()) {
      if (pose.beacon && pose.visible) found = pose
    }
    ref.current.visible = !!found
    if (!found) return
    ref.current.position.set(found.x, 1.6, found.z)
    ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.08)
  })
  return (
    <mesh ref={ref} visible={false}>
      <cylinderGeometry args={[0.35, 0.55, 2.4, 12, 1, true]} />
      <meshBasicMaterial color="#ffe56b" transparent opacity={0.28} depthWrite={false} />
    </mesh>
  )
}
