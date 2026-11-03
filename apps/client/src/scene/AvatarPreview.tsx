import type { AccessoryId, ColorId, FaceId } from '@cart-chaos/shared'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import type { Group } from 'three'
import { views } from '../views'
import { CharacterModel } from './Actors'

export function AvatarPreview({
  colorId,
  faceId,
  accessory,
  name,
}: {
  colorId: ColorId
  faceId: FaceId
  accessory: AccessoryId
  name: string
}) {
  useEffect(() => {
    views.players.set('preview', {
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
    })
    return () => {
      views.players.delete('preview')
    }
  }, [])
  return (
    <Canvas camera={{ position: [0, 1.45, 3.5], fov: 30 }} gl={{ antialias: true }}>
      <color attach="background" args={['#1d4a55']} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[2, 4, 3]} intensity={1.3} />
      <LookAt />
      <Turntable>
        <CharacterModel id="preview" colorId={colorId} faceId={faceId} accessory={accessory} name={name || 'Toi'} />
      </Turntable>
    </Canvas>
  )
}

function LookAt() {
  const camera = useThree((state) => state.camera)
  useLayoutEffect(() => {
    camera.lookAt(0, 1.15, 0)
  }, [camera])
  return null
}

function Turntable({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null)
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.7
  })
  return <group ref={group}>{children}</group>
}
