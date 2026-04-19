import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ModalShell from '@/components/ui/ModalShell'

describe('ModalShell', () => {
  it('renders nothing when closed', () => {
    render(<ModalShell open={false} onClose={vi.fn()} title="Test"><p>content</p></ModalShell>)
    expect(screen.queryByText('content')).toBeNull()
    expect(screen.queryByText('Test')).toBeNull()
  })

  it('renders title and children when open', () => {
    render(<ModalShell open={true} onClose={vi.fn()} title="Hello"><p>inner content</p></ModalShell>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('inner content')).toBeInTheDocument()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<ModalShell open={true} onClose={onClose} title="Test"><p>body</p></ModalShell>)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<ModalShell open={true} onClose={onClose} title="Test"><p>body</p></ModalShell>)
    const backdrop = screen.getByTestId('modal-backdrop')
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not call onClose when modal content is clicked', () => {
    const onClose = vi.fn()
    render(<ModalShell open={true} onClose={onClose} title="Test"><p>body</p></ModalShell>)
    fireEvent.click(screen.getByText('body'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<ModalShell open={true} onClose={onClose} title="Test"><p>body</p></ModalShell>)
    fireEvent.click(screen.getByTestId('modal-close-btn'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders in document.body via portal', () => {
    const { container } = render(
      <ModalShell open={true} onClose={vi.fn()} title="Portal Test"><p>portal body</p></ModalShell>
    )
    // The component is rendered into document.body via createPortal,
    // so the render container itself should not contain the modal content
    expect(container.querySelector('[data-testid="modal-backdrop"]')).toBeNull()
    // But document.body should have it
    expect(document.body.querySelector('[data-testid="modal-backdrop"]')).toBeTruthy()
  })
})
