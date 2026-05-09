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
    expect(screen.getByRole('button', { name: 'Back to direct messages' })).toBeInTheDocument()
  })

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn()
    render(<DMHeader otherUser={PROFILE_B} onBack={onBack} />)
    fireEvent.click(screen.getByTestId('dm-back-btn'))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('shows offline presence by default', () => {
    render(<DMHeader otherUser={PROFILE_B} onBack={vi.fn()} />)
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
    expect(screen.getByTestId('dm-presence-dot')).toHaveClass('bg-[var(--text-faint)]')
  })

  it('shows the username alongside presence when display name is present', () => {
    render(<DMHeader otherUser={PROFILE_B} onBack={vi.fn()} />)
    expect(screen.getByText('@bob')).toBeInTheDocument()
  })

  it('shows online presence when the other user is online', () => {
    render(<DMHeader otherUser={PROFILE_B} onBack={vi.fn()} isOnline />)
    expect(screen.getByText(/online/i)).toBeInTheDocument()
    expect(screen.getByTestId('dm-presence-dot')).toHaveClass('bg-[var(--online)]')
  })

  it('falls back to username when display_name is null', () => {
    const userNoDisplayName = { ...PROFILE_B, display_name: null }
    render(<DMHeader otherUser={userNoDisplayName} onBack={vi.fn()} />)
    expect(screen.getByText('bob')).toBeInTheDocument()
  })
})
