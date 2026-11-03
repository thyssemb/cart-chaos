import { useGLTF } from '@react-three/drei'
import { Component, Suspense, useEffect, useMemo, type MutableRefObject, type ReactNode } from 'react'
import type { Group, Mesh } from 'three'

const CART_URL = '/assets/models/shopping_cart.glb'

class ModelError extends Component<{ children: ReactNode; fallback: ReactNode }, { bad: boolean }> {
  state = { bad: false }
  static getDerivedStateFromError() {
    return { bad: true }
  }
  render() {
    return this.state.bad ? this.props.fallback : this.props.children
  }
}

function CartMesh({ wheelsRef }: { wheelsRef: MutableRefObject<Group | null> }) {
  const { scene } = useGLTF(CART_URL)
  const root = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
    })
    return copy
  }, [scene])
  const wheels = root.getObjectByName('wheels') as Group | undefined
  useEffect(() => {
    if (!wheels) return
    wheelsRef.current = wheels
    return () => {
      if (wheelsRef.current === wheels) wheelsRef.current = null
    }
  }, [wheels, wheelsRef])
  if (!wheels) throw new Error('roues absentes')
  return <primitive object={root} />
}

export function CartoonCart({ wheelsRef, fallback }: { wheelsRef: MutableRefObject<Group | null>; fallback: ReactNode }) {
  return (
    <ModelError fallback={fallback}>
      <Suspense fallback={fallback}>
        <CartMesh wheelsRef={wheelsRef} />
      </Suspense>
    </ModelError>
  )
}

useGLTF.preload(CART_URL)
