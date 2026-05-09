import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AvatarCropModal from '@/components/profile/AvatarCropModal'

describe('AvatarCropModal', () => {
  it('labels the avatar cropper close control', () => {
    render(<AvatarCropModal src="data:image/png;base64,test" onApply={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Close avatar cropper' })).toBeInTheDocument()
  })

  it('labels the square photo cropper close control', () => {
    render(<AvatarCropModal src="data:image/png;base64,test" onApply={vi.fn()} onClose={vi.fn()} shape="square" />)

    expect(screen.getByRole('button', { name: 'Close photo cropper' })).toBeInTheDocument()
  })

  it('closes from the labeled close control', () => {
    const onClose = vi.fn()
    render(<AvatarCropModal src="data:image/png;base64,test" onApply={vi.fn()} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close avatar cropper' }))

    expect(onClose).toHaveBeenCalled()
  })

  it('closes from the cancel button', () => {
    const onClose = vi.fn()
    render(<AvatarCropModal src="data:image/png;base64,test" onApply={vi.fn()} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalled()
  })
})
