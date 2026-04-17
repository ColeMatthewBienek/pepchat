'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { Attachment } from '@/lib/types'

interface LightboxProps {
  images: Attachment[]
  initialIndex: number
  onClose: () => void
}

export default function Lightbox({ images, initialIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex)
  const img = images[index]

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIndex(i => Math.min(images.length - 1, i + 1))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [images.length, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
      onClick={onClose}
    >
      <div
        className="relative flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        <Image
          src={img.url}
          alt={img.name}
          width={img.width ?? 1200}
          height={img.height ?? 900}
          unoptimized
          className="rounded-lg object-contain"
          style={{ maxWidth: '90vw', maxHeight: '90vh', width: 'auto', height: 'auto' }}
        />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 text-sm"
        >
          ✕
        </button>

        {/* Prev / next */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setIndex(i => Math.max(0, i - 1))}
              disabled={index === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 border border-white/20 text-white text-lg flex items-center justify-center hover:bg-black/80 disabled:opacity-25 disabled:cursor-default"
            >
              ‹
            </button>
            <button
              onClick={() => setIndex(i => Math.min(images.length - 1, i + 1))}
              disabled={index === images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 border border-white/20 text-white text-lg flex items-center justify-center hover:bg-black/80 disabled:opacity-25 disabled:cursor-default"
            >
              ›
            </button>
          </>
        )}

        {/* Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/70 bg-black/50 px-2 py-0.5 rounded-full">
            {index + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  )
}
