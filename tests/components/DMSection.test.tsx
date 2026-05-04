import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DMSection from '@/components/dm/DMSection'
import { PROFILE_A, PROFILE_B } from '@/tests/fixtures'
import type { DMConversation } from '@/lib/types'

const { mockUseParams, mockUseDMConversations } = vi.hoisted(() => ({
  mockUseParams: vi.fn(),
  mockUseDMConversations: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useParams: mockUseParams }))
vi.mock('@/lib/hooks/useDMs', () => ({ useDMConversations: mockUseDMConversations }))

const CONVERSATIONS: DMConversation[] = [
  {
    id: 'conv-active',
    user_a: PROFILE_A.id,
    user_b: PROFILE_B.id,
    last_message: 'Active unread',
    last_message_at: '2024-03-01T10:00:00Z',
    created_at: '2024-03-01T09:00:00Z',
    other_user: PROFILE_B,
    unread_count: 2,
  },
  {
    id: 'conv-other',
    user_a: PROFILE_A.id,
    user_b: 'user-c',
    last_message: 'Other unread',
    last_message_at: '2024-03-02T10:00:00Z',
    created_at: '2024-03-02T09:00:00Z',
    other_user: { ...PROFILE_B, id: 'user-c', username: 'carol', display_name: 'Carol' },
    unread_count: 4,
  },
]

describe('DMSection', () => {
  it('excludes the active conversation from the visible unread total', () => {
    mockUseParams.mockReturnValue({ conversationId: 'conv-active' })
    mockUseDMConversations.mockReturnValue({
      conversations: CONVERSATIONS,
      totalUnread: 6,
      loading: false,
    })

    render(<DMSection currentUserId={PROFILE_A.id} />)

    expect(screen.getByTestId('dm-total-unread')).toHaveTextContent('4')
    expect(screen.queryByTestId('dm-unread-count-conv-active')).not.toBeInTheDocument()
    expect(screen.getByTestId('dm-unread-count-conv-other')).toHaveTextContent('4')
  })

  it('hides the visible unread total when only the active conversation is unread', () => {
    mockUseParams.mockReturnValue({ conversationId: 'conv-active' })
    mockUseDMConversations.mockReturnValue({
      conversations: [CONVERSATIONS[0]],
      totalUnread: 2,
      loading: false,
    })

    render(<DMSection currentUserId={PROFILE_A.id} />)

    expect(screen.queryByTestId('dm-total-unread')).not.toBeInTheDocument()
  })
})
