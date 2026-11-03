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

export function makeFace(style: 'smile' | 'wink' | 'grumpy' | 'wow' | 'cool' | 'hit' | boolean = 'smile') {
  const kind = style === true ? 'hit' : style === false ? 'smile' : style
  return canvasTexture(256, 256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256)
    ctx.lineCap = 'round'
    ctx.lineWidth = 10
    ctx.strokeStyle = '#1b2430'
    ctx.fillStyle = '#1b2430'
    if (kind === 'hit') {
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
    } else if (kind === 'cool') {
      ctx.fillStyle = '#1b2430'
      ctx.fillRect(40, 86, 76, 22)
      ctx.fillRect(140, 86, 76, 22)
      ctx.fillRect(110, 92, 36, 8)
    } else if (kind === 'wink') {
      eye(ctx, 78, 100, true)
      ctx.beginPath()
      ctx.moveTo(150, 104)
      ctx.quadraticCurveTo(178, 78, 206, 104)
      ctx.stroke()
    } else if (kind === 'wow') {
      eye(ctx, 78, 96, true, 22)
      eye(ctx, 178, 96, true, 22)
    } else {
      eye(ctx, 78, 100, true)
      eye(ctx, 178, 100, true)
    }
    ctx.strokeStyle = '#1b2430'
    ctx.fillStyle = '#1b2430'
    ctx.beginPath()
    if (kind === 'grumpy') ctx.arc(128, 196, 34, 1.15 * Math.PI, 1.85 * Math.PI)
    else if (kind === 'wow') ctx.arc(128, 176, 16, 0, Math.PI * 2)
    else if (kind === 'hit') ctx.arc(128, 176, 28, 0.2 * Math.PI, 0.8 * Math.PI)
    else ctx.arc(128, 168, 36, 0.15 * Math.PI, 0.85 * Math.PI)
    if (kind === 'wow') ctx.fill()
    else ctx.stroke()
    if (kind !== 'hit' && kind !== 'cool' && kind !== 'grumpy') {
      ctx.fillStyle = '#ff8fb3'
      ctx.beginPath()
      ctx.arc(58, 132, 14, 0, Math.PI * 2)
      ctx.arc(198, 132, 14, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

function eye(ctx: CanvasRenderingContext2D, x: number, y: number, open: boolean, radius = 16) {
  if (!open) return
  ctx.fillStyle = '#1b2430'
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(x + 5, y - 6, Math.max(4, radius * 0.32), 0, Math.PI * 2)
  ctx.fill()
}

export function makeBubble(text: string) {
  return canvasTexture(1024, 200, (ctx) => {
    ctx.clearRect(0, 0, 1024, 200)
    ctx.fillStyle = '#fff6df'
    round(ctx, 16, 28, 992, 144, 48)
    ctx.fill()
    ctx.fillStyle = '#14323c'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const line = text.slice(0, 80)
    let size = 56
    ctx.font = `700 ${size}px Fredoka, Trebuchet MS, sans-serif`
    while (size > 26 && ctx.measureText(line).width > 920) {
      size -= 2
      ctx.font = `700 ${size}px Fredoka, Trebuchet MS, sans-serif`
    }
    ctx.fillText(line, 512, 102)
  })
}

export function makeRoster(lines: { name: string; ready: boolean; host: boolean }[]) {
  return canvasTexture(512, 640, (ctx) => {
    ctx.fillStyle = '#f4fbff'
    ctx.fillRect(0, 0, 512, 640)
    ctx.fillStyle = '#ff5d6c'
    ctx.fillRect(0, 0, 512, 84)
    ctx.fillStyle = '#fffaf2'
    ctx.font = '700 42px Fredoka, Trebuchet MS, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('ÉQUIPE', 256, 44)
    if (lines.length === 0) {
      ctx.fillStyle = '#14323c'
      ctx.font = '700 32px Fredoka, Trebuchet MS, sans-serif'
      ctx.fillText('Personne pour l’instant', 256, 320)
      return
    }
    lines.slice(0, 6).forEach((line, index) => {
      const y = 150 + index * 78
      ctx.fillStyle = index % 2 === 0 ? '#e7f4ff' : '#fff6ea'
      ctx.fillRect(24, y - 36, 464, 64)
      ctx.textAlign = 'left'
      ctx.fillStyle = '#14323c'
      ctx.font = '700 30px Fredoka, Trebuchet MS, sans-serif'
      const name = `${line.host ? '★ ' : ''}${line.name}`.slice(0, 18)
      ctx.fillText(name, 40, y)
      ctx.textAlign = 'right'
      ctx.fillStyle = line.ready ? '#148a52' : '#c46a12'
      ctx.fillText(line.ready ? 'À bord' : 'Dehors', 470, y)
    })
  })
}

export function makeCodePlate(code: string) {
  return canvasTexture(512, 320, (ctx) => {
    ctx.fillStyle = '#14323c'
    ctx.fillRect(0, 0, 512, 320)
    ctx.fillStyle = '#ffd56a'
    ctx.font = '700 28px Fredoka, Trebuchet MS, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('CODE DU SALON', 256, 64)
    ctx.fillStyle = '#fff6df'
    ctx.font = '700 92px Fredoka, Trebuchet MS, sans-serif'
    ctx.fillText(code.slice(0, 4), 256, 168)
    ctx.fillStyle = '#9ad7ff'
    ctx.font = '700 26px Fredoka, Trebuchet MS, sans-serif'
    ctx.fillText('E pour copier', 256, 258)
  })
}

export function makePoster(title: string, line: string, background: string, ink: string) {
  return canvasTexture(512, 680, (ctx) => {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, 512, 680)
    ctx.fillStyle = ink
    ctx.fillRect(28, 28, 456, 14)
    ctx.fillRect(28, 638, 456, 14)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '700 58px Fredoka, Trebuchet MS, sans-serif'
    ctx.fillText(title, 256, 180)
    ctx.font = '700 32px Fredoka, Trebuchet MS, sans-serif'
    const words = line.split(' ')
    let row = ''
    let y = 280
    for (const word of words) {
      const next = row ? `${row} ${word}` : word
      if (ctx.measureText(next).width > 420) {
        ctx.fillText(row, 256, y)
        row = word
        y += 46
      } else row = next
    }
    if (row) ctx.fillText(row, 256, y)
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

export function makePrice(text: string) {
  return canvasTexture(256, 96, (ctx) => {
    ctx.fillStyle = '#fff8ea'
    ctx.fillRect(0, 0, 256, 96)
    ctx.strokeStyle = '#243038'
    ctx.lineWidth = 8
    ctx.strokeRect(6, 6, 244, 84)
    ctx.fillStyle = '#243038'
    ctx.font = '700 52px Fredoka, Trebuchet MS, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 128, 50)
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
