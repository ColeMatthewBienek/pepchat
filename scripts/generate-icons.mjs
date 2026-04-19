import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background — chili red
  ctx.fillStyle = '#e6543a'
  ctx.beginPath()
  const radius = size * 0.22
  ctx.roundRect(0, 0, size, size, radius)
  ctx.fill()

  // Letter "P" centered
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.round(size * 0.52)}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('P', size / 2, size / 2 + size * 0.03)

  return canvas.toBuffer('image/png')
}

writeFileSync('public/icon-192.png', generateIcon(192))
writeFileSync('public/icon-512.png', generateIcon(512))
console.log('Icons generated successfully')
