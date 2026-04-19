import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DMHeader from '@/components/dm/DMHeader'
import { PROFILE_B } from '@/tests/fixtures'

describe('DMHeader', () => {
  it('renders the other user display name', () => {
    render(<DMHeader otherUser={PROFILE_B} onBack={vi.fn()} />)
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('renders back button', () => {
    render(<DMHeader otherUser={PROFILE_B} onBack={vi.fn()} />)
    expect(screen.getByTestId('dm-back-btn')).toBeInTheDocument()
  })

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn()
    render(<DMHeader otherUser={PROFILE_B} onBack={onBack} />)
    fireEvent.click(screen.getByTestId('dm-back-btn'))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('shows "Direct Message" subtitle', () => {
    render(<DMHeader otherUser={PROFILE_B} onBack={vi.fn()} />)
    expect(screen.getByText(/direct message/i)).toBeInTheDocument()
  })

  it('falls back to username when display_name is null', () => {
    const userNoDisplayName = { ...PROFILE_B, display_name: null }
    render(<DMHeader otherUser={userNoDisplayName} onBack={vi.fn()} />)
    expect(screen.getByText('bob')).toBeInTheDocument()
  })
})
