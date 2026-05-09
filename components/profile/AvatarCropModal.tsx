'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface AvatarCropModalProps {
  src: string
  onApply: (croppedDataUrl: string, ext: string) => void
  onClose: () => void
  shape?: 'circle' | 'square'
}

export default function AvatarCropModal({ src, onApply, onClose, shape = 'circle' }: AvatarCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })
  const [loaded, setLoaded] = useState(false)

  const SIZE = 280 // canvas display size

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !loaded) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, SIZE, SIZE)

    // Draw image
    const dw = img.naturalWidth * scale
    const dh = img.naturalHeight * scale
    ctx.drawImage(img, offset.x, offset.y, dw, dh)

    // Mask overlay
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, SIZE, SIZE)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    if (shape === 'square') {
      const r = SIZE * 0.12
      ctx.roundRect(4, 4, SIZE - 8, SIZE - 8, r)
    } else {
      ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 4, 0, Math.PI * 2)
    }
    ctx.fill()
    ctx.restore()

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 2
    ctx.beginPath()
    if (shape === 'square') {
      const r = SIZE * 0.12
      ctx.roundRect(4, 4, SIZE - 8, SIZE - 8, r)
    } else {
      ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 4, 0, Math.PI * 2)
    }
    ctx.stroke()
  }, [offset, scale, loaded])

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      // Fit image to fill circle by default
      const fit = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight)
      setScale(fit)
      setOffset({ x: (SIZE - img.naturalWidth * fit) / 2, y: (SIZE - img.naturalHeight * fit) / 2 })
      setLoaded(true)
    }
    img.src = src
  }, [src])

  useEffect(() => { draw() }, [draw])

  function onPointerDown(e: React.PointerEvent) {
    setDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const dx = e.clientX - dragStart.current.mx
    const dy = e.clientY - dragStart.current.my
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy })
  }

  function onPointerUp() { setDragging(false) }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    const img = imgRef.current
    if (!img) return
    const minScale = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight)
    const newScale = Math.max(minScale, Math.min(scale + delta * scale, 4))
    // Scale around center
    const cx = SIZE / 2
    const cy = SIZE / 2
    setOffset(prev => ({
      x: cx - (cx - prev.x) * (newScale / scale),
      y: cy - (cy - prev.y) * (newScale / scale),
    }))
    setScale(newScale)
  }

  function handleApply() {
    const img = imgRef.current
    if (!img) return
    const out = document.createElement('canvas')
    out.width = 256
    out.height = 256
    const ctx = out.getContext('2d')!
    const factor = 256 / SIZE
    ctx.beginPath()
    if (shape === 'square') {
      ctx.roundRect(0, 0, 256, 256, 256 * 0.12)
    } else {
      ctx.arc(128, 128, 128, 0, Math.PI * 2)
    }
    ctx.clip()
    ctx.drawImage(
      img,
      offset.x * factor, offset.y * factor,
      img.naturalWidth * scale * factor,
      img.naturalHeight * scale * factor
    )
    const dataUrl = out.toDataURL('image/webp', 0.92)
    onApply(dataUrl, 'webp')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="rounded-xl border border-white/10 p-5 flex flex-col gap-4" style={{ background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{shape === 'square' ? 'Crop Photo' : 'Crop Avatar'}</h3>
          <button
            onClick={onClose}
            aria-label={shape === 'square' ? 'Close photo cropper' : 'Close avatar cropper'}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-[var(--text-muted)]">Drag to reposition · Scroll to zoom</p>

        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="rounded-lg cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={handleWheel}
        />

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 rounded text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button onClick={handleApply} className="px-4 py-1.5 rounded text-sm font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent)]/90 transition-colors">
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
