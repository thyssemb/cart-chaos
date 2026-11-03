import { SHELVES, type ProductType } from '@cart-chaos/shared'
import { useGLTF } from '@react-three/drei'
import { Component, Suspense, useMemo, type ReactNode } from 'react'
import type { Mesh } from 'three'

const FOOD_URL = '/assets/models/food_products.glb'

export type PackedProduct = 'milk' | 'cheese' | 'cereal' | 'drink'

const PACKED: PackedProduct[] = ['milk', 'cheese', 'cereal', 'drink']

export function isPackedProduct(type: ProductType): type is PackedProduct {
  return (PACKED as string[]).includes(type)
}

/** Label faces local +Z. Point that side from the shelf toward the aisle. */
export function shelfFacing(x: number, z: number) {
  let best = SHELVES[0]
  let score = Number.POSITIVE_INFINITY
  if (!best) return 0
  for (const shelf of SHELVES) {
    const distance = (x - shelf.x) ** 2 + (z - shelf.z) ** 2
    if (distance < score) {
      score = distance
      best = shelf
    }
  }
  return Math.atan2(x - best.x, z - best.z)
}

class ModelError extends Component<{ children: ReactNode; fallback: ReactNode }, { bad: boolean }> {
  state = { bad: false }
  static getDerivedStateFromError() {
    return { bad: true }
  }
  render() {
    return this.state.bad ? this.props.fallback : this.props.children
  }
}

function PackedMesh({ type }: { type: PackedProduct }) {
  const { scene } = useGLTF(FOOD_URL)
  const object = useMemo(() => {
    const source = scene.getObjectByName(type)
    if (!source) throw new Error(`modèle absent: ${type}`)
    const copy = source.clone(true)
    copy.position.set(0, 0, 0)
    copy.rotation.set(0, 0, 0)
    copy.scale.set(1, 1, 1)
    copy.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
    })
    return copy
  }, [scene, type])
  return <primitive object={object} />
}

export function FoodProduct({ type, fallback }: { type: PackedProduct; fallback: ReactNode }) {
  return (
    <ModelError fallback={fallback}>
      <Suspense fallback={fallback}>
        <PackedMesh type={type} />
      </Suspense>
    </ModelError>
  )
}

useGLTF.preload(FOOD_URL)
