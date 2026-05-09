import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Lightbox from '@/components/chat/Lightbox'
import type { ImageAttachment } from '@/lib/types'

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    unoptimized: _unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

const IMAGES: ImageAttachment[] = [
  {
    type: 'image',
    url: 'https://example.com/one.jpg',
    name: 'First image',
    size: 1234,
    width: 800,
    height: 600,
  },
  {
    type: 'image',
    url: 'https://example.com/two.jpg',
    name: 'Second image',
    size: 1234,
    width: 800,
    height: 600,
  },
]

describe('Lightbox', () => {
  it('labels image preview controls', () => {
    render(<Lightbox images={IMAGES} initialIndex={0} onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Close image preview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous image' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next image' })).toBeEnabled()
  })

  it('navigates between images with labeled controls', () => {
    render(<Lightbox images={IMAGES} initialIndex={0} onClose={vi.fn()} />)

    expect(screen.getByRole('img', { name: 'First image' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next image' }))

    expect(screen.getByRole('img', { name: 'Second image' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous image' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Next image' })).toBeDisabled()
  })

  it('closes from the labeled close control', () => {
    const onClose = vi.fn()
    render(<Lightbox images={IMAGES} initialIndex={0} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close image preview' }))

    expect(onClose).toHaveBeenCalled()
  })

  it('closes with Escape', () => {
    const onClose = vi.fn()
    render(<Lightbox images={IMAGES} initialIndex={0} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })
})
