import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DMEntry from '@/components/dm/DMEntry'
import { PROFILE_B } from '@/tests/fixtures'
import type { DMConversation } from '@/lib/types'

const CONVERSATION: DMConversation = {
  id: 'conv-1',
  user_a: 'user-a',
  user_b: 'user-b',
  last_message: 'Hello',
  last_message_at: '2024-03-01T10:00:00Z',
  created_at: '2024-03-01T09:00:00Z',
  other_user: PROFILE_B,
  unread_count: 3,
}

describe('DMEntry', () => {
  it('shows unread dot and count for an unread inactive conversation', () => {
    render(<DMEntry conversation={CONVERSATION} isActive={false} />)

    expect(screen.getByTestId('dm-unread-dot-conv-1')).toBeInTheDocument()
    expect(screen.getByTestId('dm-unread-count-conv-1')).toHaveTextContent('3')
  })

  it('caps unread count at 99+', () => {
    render(<DMEntry conversation={{ ...CONVERSATION, unread_count: 120 }} isActive={false} />)

    expect(screen.getByTestId('dm-unread-count-conv-1')).toHaveTextContent('99+')
  })

  it('hides unread indicators for the active conversation', () => {
    render(<DMEntry conversation={CONVERSATION} isActive />)

    expect(screen.queryByTestId('dm-unread-dot-conv-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('dm-unread-count-conv-1')).not.toBeInTheDocument()
  })
})
