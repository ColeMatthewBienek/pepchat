import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import DMConversationView from '@/components/dm/DMConversationView'
import { DM_MESSAGE, PROFILE_A, PROFILE_B } from '@/tests/fixtures'

const mockMessageList = vi.hoisted(() => vi.fn(({ highlightedMessageId, messageLinkBasePath }: any) => (
  <div>
    <div data-testid="dm-message-link-base">{messageLinkBasePath}</div>
    <div data-testid="dm-message-highlight">{highlightedMessageId ?? ''}</div>
  </div>
)))

const { mockReplace, mockBack, mockMarkDMsRead, mockDMMessageCount, mockOnlineUsers, mockDMHeader } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockBack: vi.fn(),
  mockMarkDMsRead: vi.fn().mockResolvedValue(undefined),
  mockDMMessageCount: { value: 1 },
  mockOnlineUsers: { value: [] as Array<{ user_id: string; username: string; avatar_url: string | null }> },
  mockDMHeader: vi.fn((_props: any) => <div data-testid="dm-header" />),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
}))

vi.mock('@/components/chat/MessageList', () => ({ default: (props: any) => mockMessageList(props) }))
vi.mock('@/components/chat/MessageInput', () => ({ default: () => <div data-testid="message-input" /> }))
vi.mock('@/components/chat/TypingIndicator', () => ({ default: () => <div data-testid="typing-indicator" /> }))
vi.mock('@/components/dm/DMHeader', () => ({ default: (props: any) => mockDMHeader(props) }))
vi.mock('@/components/dm/DMEmptyState', () => ({ default: () => <div data-testid="dm-empty-state" /> }))

vi.mock('@/lib/hooks/usePresence', () => ({
  usePresence: () => ({ onlineUsers: mockOnlineUsers.value, typingUsernames: [], broadcastTyping: vi.fn() }),
}))

vi.mock('@/lib/hooks/useDMs', () => ({
  useDMMessages: () => ({
    messages: Array.from({ length: mockDMMessageCount.value }, (_, index) => ({
      id: `dm-${index + 1}`,
      channel_id: 'conv-1',
      user_id: index === 0 ? 'user-a' : 'user-b',
      content: index === 0 ? 'Hey Bob!' : 'New reply',
      reply_to_id: null,
      edited_at: null,
      created_at: `2024-03-01T10:0${index}:00Z`,
      attachments: [],
      profiles: { username: index === 0 ? 'alice' : 'bob', avatar_url: null, display_name: index === 0 ? 'Alice' : 'Bob' },
      reactions: [],
      replied_to: null,
    })),
    hasMore: false,
    loadingMore: false,
    loadMore: vi.fn(),
    addMessage: vi.fn(),
    removeMessage: vi.fn(),
    updateMessageContent: vi.fn(),
  }),
}))

vi.mock('@/app/(app)/dm/actions', () => ({
  sendDM: vi.fn(),
  editDM: vi.fn(),
  deleteDM: vi.fn(),
  markDMsRead: mockMarkDMsRead,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: PROFILE_A.id } } }) },
    from: (table: string) => {
      const data = table === 'dm_conversations'
        ? {
            id: DM_MESSAGE.conversation_id,
            user_a: PROFILE_A.id,
            user_b: PROFILE_B.id,
            user_a_profile: PROFILE_A,
            user_b_profile: PROFILE_B,
          }
        : PROFILE_A
      const builder: Record<string, unknown> = {}
      for (const method of ['select', 'eq']) builder[method] = vi.fn(() => builder)
      builder.single = vi.fn().mockResolvedValue({ data, error: null })
      return builder
    },
  }),
}))

describe('DMConversationView — message links', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDMMessageCount.value = 1
    mockOnlineUsers.value = []
    window.history.replaceState(null, '', `/dm/${DM_MESSAGE.conversation_id}`)
  })

  it('passes the DM message link base path to MessageList', async () => {
    render(<DMConversationView conversationId={DM_MESSAGE.conversation_id} />)

    await waitFor(() => expect(screen.getByTestId('dm-message-link-base')).toHaveTextContent('/dm'))
  })

  it('passes the URL hash message id to MessageList for highlighting on mount', async () => {
    window.history.replaceState(null, '', `/dm/${DM_MESSAGE.conversation_id}#${DM_MESSAGE.id}`)

    render(<DMConversationView conversationId={DM_MESSAGE.conversation_id} />)

    await waitFor(() => expect(screen.getByTestId('dm-message-highlight')).toHaveTextContent(DM_MESSAGE.id))
  })

  it('disables channel-style mark unread for DM messages', async () => {
    render(<DMConversationView conversationId={DM_MESSAGE.conversation_id} />)

    await waitFor(() => expect(mockMessageList.mock.calls.at(-1)?.[0].allowMarkUnread).toBe(false))
  })

  it('disables channel-style reports for DM messages', async () => {
    render(<DMConversationView conversationId={DM_MESSAGE.conversation_id} />)

    await waitFor(() => expect(mockMessageList.mock.calls.at(-1)?.[0].allowReports).toBe(false))
  })

  it('marks new messages read while the DM conversation is open', async () => {
    const { rerender } = render(<DMConversationView conversationId={DM_MESSAGE.conversation_id} />)

    await waitFor(() => expect(mockMarkDMsRead).toHaveBeenCalledWith(DM_MESSAGE.conversation_id))
    mockMarkDMsRead.mockClear()

    mockDMMessageCount.value = 2
    rerender(<DMConversationView conversationId={DM_MESSAGE.conversation_id} />)

    await waitFor(() => expect(mockMarkDMsRead).toHaveBeenCalledWith(DM_MESSAGE.conversation_id))
  })

  it('passes online presence for the other DM participant to the header', async () => {
    mockOnlineUsers.value = [{ user_id: PROFILE_B.id, username: PROFILE_B.username, avatar_url: PROFILE_B.avatar_url }]

    render(<DMConversationView conversationId={DM_MESSAGE.conversation_id} />)

    await waitFor(() => {
      expect(mockDMHeader).toHaveBeenLastCalledWith(expect.objectContaining({ isOnline: true }))
    })
  })
})
