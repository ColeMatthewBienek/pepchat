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

const { mockReplace, mockBack, mockMarkDMsRead } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockBack: vi.fn(),
  mockMarkDMsRead: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
}))

vi.mock('@/components/chat/MessageList', () => ({ default: (props: any) => mockMessageList(props) }))
vi.mock('@/components/chat/MessageInput', () => ({ default: () => <div data-testid="message-input" /> }))
vi.mock('@/components/chat/TypingIndicator', () => ({ default: () => <div data-testid="typing-indicator" /> }))
vi.mock('@/components/dm/DMHeader', () => ({ default: () => <div data-testid="dm-header" /> }))
vi.mock('@/components/dm/DMEmptyState', () => ({ default: () => <div data-testid="dm-empty-state" /> }))

vi.mock('@/lib/hooks/usePresence', () => ({
  usePresence: () => ({ typingUsernames: [], broadcastTyping: vi.fn() }),
}))

vi.mock('@/lib/hooks/useDMs', () => ({
  useDMMessages: () => ({
    messages: [{
      id: DM_MESSAGE.id,
      channel_id: DM_MESSAGE.conversation_id,
      user_id: DM_MESSAGE.sender_id,
      content: DM_MESSAGE.content,
      reply_to_id: null,
      edited_at: null,
      created_at: DM_MESSAGE.created_at,
      attachments: [],
      profiles: { username: PROFILE_A.username, avatar_url: PROFILE_A.avatar_url, display_name: PROFILE_A.display_name },
      reactions: [],
      replied_to: null,
    }],
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
})
