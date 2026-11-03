import * as THREE from 'three'

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)
  draw(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function makeTiles() {
  const texture = canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#f7f1e6'
    ctx.fillRect(0, 0, 128, 128)
    ctx.fillStyle = '#f1e6d4'
    ctx.fillRect(0, 0, 64, 64)
    ctx.fillRect(64, 64, 64, 64)
    ctx.strokeStyle = '#e4d5c0'
    ctx.lineWidth = 5
    ctx.strokeRect(2, 2, 124, 124)
  })
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(28, 22)
  return texture
}

export function makeOveralls() {
  return canvasTexture(64, 64, (ctx) => {
    ctx.fillStyle = '#3c7dff'
    ctx.fillRect(0, 0, 64, 64)
    ctx.strokeStyle = '#2a5ed4'
    ctx.lineWidth = 4
    for (let x = -16; x < 80; x += 10) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x + 24, 64)
      ctx.stroke()
    }
  })
}

export function makeFace(hit = false) {
  return canvasTexture(256, 256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256)
    ctx.fillStyle = '#ff8fb3'
    ctx.beginPath()
    ctx.arc(70, 128, 16, 0, Math.PI * 2)
    ctx.arc(186, 128, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#1b2430'
    ctx.lineWidth = 10
    ctx.lineCap = 'round'
    if (hit) {
      ctx.beginPath()
      ctx.moveTo(58, 78)
      ctx.lineTo(98, 112)
      ctx.moveTo(98, 78)
      ctx.lineTo(58, 112)
      ctx.moveTo(158, 78)
      ctx.lineTo(198, 112)
      ctx.moveTo(198, 78)
      ctx.lineTo(158, 112)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(78, 100, 16, 0, Math.PI * 2)
      ctx.arc(178, 100, 16, 0, Math.PI * 2)
      ctx.fillStyle = '#1b2430'
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(84, 94, 5, 0, Math.PI * 2)
      ctx.arc(184, 94, 5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.strokeStyle = '#1b2430'
    ctx.beginPath()
    ctx.arc(128, 168, 36, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()
  })
}

export function makeLabel(text: string, color: string) {
  const texture = canvasTexture(512, 128, (ctx) => {
    ctx.clearRect(0, 0, 512, 128)
    ctx.font = '700 64px Fredoka, Trebuchet MS, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 10
    ctx.strokeStyle = '#14323c'
    ctx.strokeText(text, 256, 68)
    ctx.fillStyle = color
    ctx.fillText(text, 256, 68)
  })
  texture.needsUpdate = true
  return texture
}

export function makeSign(text: string, background: string, foreground: string) {
  return canvasTexture(512, 160, (ctx) => {
    ctx.fillStyle = background
    round(ctx, 12, 16, 488, 128, 36)
    ctx.fill()
    ctx.fillStyle = foreground
    ctx.font = '700 68px Fredoka, Trebuchet MS, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 256, 84)
  })
}

export function makeBasket() {
  const texture = canvasTexture(128, 128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128)
    ctx.strokeStyle = '#9aa6b2'
    ctx.lineWidth = 6
    for (let i = 4; i < 128; i += 16) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, 128)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(128, i)
      ctx.stroke()
    }
  })
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
