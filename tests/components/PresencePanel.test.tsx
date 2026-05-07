import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PresencePanel from '@/components/chat/PresencePanel'
import type { OnlineUser } from '@/lib/hooks/usePresence'

const ONLINE_USERS: OnlineUser[] = [
  { user_id: 'user-a', username: 'alice', avatar_url: null },
  { user_id: 'user-b', username: 'bob', avatar_url: null },
]

describe('PresencePanel', () => {
  it('shows the online member count and usernames', () => {
    render(<PresencePanel onlineUsers={ONLINE_USERS} />)

    expect(screen.getByText('Online — 2')).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()
  })

  it('shows an empty state when no users are online', () => {
    render(<PresencePanel onlineUsers={[]} />)

    expect(screen.getByText('Online — 0')).toBeInTheDocument()
    expect(screen.getByText('No one else here yet.')).toBeInTheDocument()
  })

  it('collapses and expands with accessible controls', () => {
    render(<PresencePanel onlineUsers={ONLINE_USERS} />)

    fireEvent.click(screen.getByRole('button', { name: 'Collapse online members panel' }))

    expect(screen.queryByText('Online — 2')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show online members (2)' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show online members (2)' }))

    expect(screen.getByText('Online — 2')).toBeInTheDocument()
  })
})
