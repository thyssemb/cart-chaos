export interface Pose {
  x: number
  y: number
  z: number
  yaw: number
  vx: number
  vz: number
  speed: number
  grounded: boolean
  holding: boolean
  carrying: boolean
  hit: boolean
  celebrate: boolean
  connected: boolean
}

export interface CartPose {
  x: number
  z: number
  yaw: number
  held: boolean
  count: number
}

export interface ProductPose {
  x: number
  y: number
  z: number
  yaw: number
  visible: boolean
  beacon: boolean
}

export const views = {
  players: new Map<string, Pose>(),
  carts: new Map<string, CartPose>(),
  products: new Map<string, ProductPose>(),
  local: {
    x: 12,
    y: 0,
    z: -10,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0.15,
    grounded: true,
    ready: false,
  },
}

export const control = {
  keys: new Set<string>(),
  yaw: 0.15,
  jumpUntil: 0,
  interactHeld: false,
}

export function readInput() {
  const keys = control.keys
  const forward = keys.has('z') || keys.has('w') || keys.has('arrowup') ? 1 : keys.has('s') || keys.has('arrowdown') ? -1 : 0
  const strafe = keys.has('d') || keys.has('arrowright') ? 1 : keys.has('q') || keys.has('a') || keys.has('arrowleft') ? -1 : 0
  return {
    seq: 0,
    forward,
    strafe,
    yaw: control.yaw,
    sprint: keys.has('shift'),
    jump: performance.now() < control.jumpUntil,
    interactHeld: control.interactHeld,
  }
}

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  ;(window as Window & { __cart?: { control: typeof control; views: typeof views } }).__cart = { control, views }
}

export function lerpAngle(a: number, b: number, t: number) {
  let delta = b - a
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  return a + delta * t
}
