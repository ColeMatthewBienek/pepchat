import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ReactionPills from '@/components/chat/ReactionPills'
import type { Reaction } from '@/lib/types'

function makeReaction(userId: string): Reaction {
  return {
    id: 'r1',
    message_id: 'm1',
    user_id: userId,
    emoji: '👍',
    created_at: '2024-01-01T00:00:00Z',
    profiles: { username: userId === 'u1' ? 'alice' : 'bob' },
  }
}

describe('ReactionPills — reacted state', () => {
  it('reacted pill does not use indigo classes', () => {
    render(<ReactionPills reactions={[makeReaction('u1')]} currentUserId="u1" onToggle={vi.fn()} />)
    const btn = screen.getByRole('button')
    expect(btn.className).not.toMatch(/indigo/)
  })

  it('reacted pill has data-reacted attribute', () => {
    render(<ReactionPills reactions={[makeReaction('u1')]} currentUserId="u1" onToggle={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('data-reacted', 'true')
  })

  it('unreacted pill does not have data-reacted attribute', () => {
    render(<ReactionPills reactions={[makeReaction('u2')]} currentUserId="u1" onToggle={vi.fn()} />)
    expect(screen.getByRole('button')).not.toHaveAttribute('data-reacted', 'true')
  })
})

describe('ReactionPills — general', () => {
  it('renders nothing when reactions is empty', () => {
    const { container } = render(<ReactionPills reactions={[]} currentUserId="u1" onToggle={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('calls onToggle with emoji when clicked', () => {
    const onToggle = vi.fn()
    render(<ReactionPills reactions={[makeReaction('u2')]} currentUserId="u1" onToggle={onToggle} />)
    screen.getByRole('button').click()
    expect(onToggle).toHaveBeenCalledWith('👍')
  })

  it('shows emoji and count', () => {
    render(<ReactionPills reactions={[makeReaction('u2')]} currentUserId="u1" onToggle={vi.fn()} />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveTextContent('👍')
    expect(btn).toHaveTextContent('1')
  })
})
