'use client'

import { useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import type { Attachment } from '@/lib/types'

const Lightbox = dynamic(() => import('./Lightbox'), { ssr: false })

interface MessageAttachmentsProps {
  attachments: Attachment[]
}

export default function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const images = (attachments ?? []).filter(a => a.type === 'image')
  if (images.length === 0) return null

  const count = images.length

  return (
    <div className="mt-1.5">
      {count === 1 && (
        <button
          className="block cursor-zoom-in rounded-lg overflow-hidden border border-white/10 hover:border-white/25 transition-colors"
          onClick={() => setLightboxIndex(0)}
        >
          <Image
            src={images[0].url}
            alt={images[0].name}
            width={images[0].width ?? 800}
            height={images[0].height ?? 600}
            unoptimized
            loading="lazy"
            className="rounded-lg object-contain"
            style={{ maxWidth: 400, maxHeight: 300, width: 'auto', height: 'auto', display: 'block' }}
          />
        </button>
      )}

      {count === 2 && (
        <div className="grid grid-cols-2 gap-1" style={{ maxWidth: 400 }}>
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setLightboxIndex(i)}
              className="relative overflow-hidden rounded-lg border border-white/10 hover:border-white/25 transition-colors cursor-zoom-in"
              style={{ height: 160 }}
            >
              <Image src={img.url} alt={img.name} fill unoptimized loading="lazy" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {count === 3 && (
        <div className="grid gap-1" style={{ maxWidth: 400 }}>
          <button
            onClick={() => setLightboxIndex(0)}
            className="relative overflow-hidden rounded-lg border border-white/10 hover:border-white/25 transition-colors cursor-zoom-in"
            style={{ height: 180 }}
          >
            <Image src={images[0].url} alt={images[0].name} fill unoptimized loading="lazy" className="object-cover" />
          </button>
          <div className="grid grid-cols-2 gap-1">
            {images.slice(1).map((img, i) => (
              <button
                key={i + 1}
                onClick={() => setLightboxIndex(i + 1)}
                className="relative overflow-hidden rounded-lg border border-white/10 hover:border-white/25 transition-colors cursor-zoom-in"
                style={{ height: 130 }}
              >
                <Image src={img.url} alt={img.name} fill unoptimized loading="lazy" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {count === 4 && (
        <div className="grid grid-cols-2 gap-1" style={{ maxWidth: 400 }}>
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setLightboxIndex(i)}
              className="relative overflow-hidden rounded-lg border border-white/10 hover:border-white/25 transition-colors cursor-zoom-in"
              style={{ height: 150 }}
            >
              <Image src={img.url} alt={img.name} fill unoptimized loading="lazy" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
