import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DMEmptyState from '@/components/dm/DMEmptyState'
import { PROFILE_B } from '@/tests/fixtures'

describe('DMEmptyState', () => {
  it('shows the other user identity', () => {
    render(<DMEmptyState otherUser={PROFILE_B} />)

    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getAllByText('@bob')).toHaveLength(2)
  })

  it('shows offline presence by default', () => {
    render(<DMEmptyState otherUser={PROFILE_B} />)

    expect(screen.getByText('Offline')).toBeInTheDocument()
    expect(screen.getByTestId('dm-empty-presence-dot')).toHaveClass('bg-[var(--text-faint)]')
  })

  it('shows online presence when the other user is online', () => {
    render(<DMEmptyState otherUser={PROFILE_B} isOnline />)

    expect(screen.getByText('Online now')).toBeInTheDocument()
    expect(screen.getByTestId('dm-empty-presence-dot')).toHaveClass('bg-[var(--online)]')
  })
})
