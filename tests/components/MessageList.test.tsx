import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import MessageList from '@/components/chat/MessageList'
import type { MessageWithProfile } from '@/lib/types'

// Minimal Message mock — emits the same edit events as the real component
vi.mock('@/components/chat/Message', () => ({
  default: ({ msg, editingId, editContent, onStartEdit, onSubmitEdit, onCancelEdit, onEditContentChange }: any) => {
    const isEditing = editingId === msg.id
    return (
      <div data-testid={`msg-${msg.id}`}>
        <span data-testid={`content-${msg.id}`}>{msg.content}</span>
        {isEditing ? (
          <div>
            <textarea
              data-testid="edit-textarea"
              value={editContent}
              onChange={e => onEditContentChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmitEdit(msg.id) }
                if (e.key === 'Escape') onCancelEdit()
              }}
            />
          </div>
        ) : (
          <button data-testid={`edit-btn-${msg.id}`} onClick={() => onStartEdit(msg)}>Edit</button>
        )}
      </div>
    )
  },
}))

vi.mock('next/dynamic', () => ({ default: () => () => null }))
vi.mock('@/app/(app)/messages/actions', () => ({
  editMessage: vi.fn(),
  deleteMessage: vi.fn(),
}))

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

const MSG: MessageWithProfile = {
  id: 'msg-1',
  user_id: 'u1',
  channel_id: 'ch-1',
  content: 'Hello',
  created_at: new Date().toISOString(),
  edited_at: null,
  reply_to_id: null,
  replied_to: null,
  attachments: [],
  reactions: [],
  profiles: { username: 'alice', display_name: null, avatar_url: null },
}

const BASE_PROPS = {
  messages: [MSG],
  hasMore: false,
  loadingMore: false,
  currentUserId: 'u1',
  currentUsername: 'alice',
  onLoadMore: vi.fn(),
  onReact: vi.fn(),
  onReply: vi.fn(),
}

describe('MessageList — submitEdit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls editAction with messageId and trimmed content on Enter', async () => {
    const editAction = vi.fn().mockResolvedValue({ ok: true })
    render(<MessageList {...BASE_PROPS} editAction={editAction} />)

    fireEvent.click(screen.getByTestId('edit-btn-msg-1'))
    fireEvent.change(screen.getByTestId('edit-textarea'), { target: { value: '  Updated  ' } })
    fireEvent.keyDown(screen.getByTestId('edit-textarea'), { key: 'Enter', shiftKey: false })

    await waitFor(() => expect(editAction).toHaveBeenCalledWith('msg-1', '  Updated  '))
  })

  it('closes edit mode when action returns { ok: true }', async () => {
    const editAction = vi.fn().mockResolvedValue({ ok: true })
    render(<MessageList {...BASE_PROPS} editAction={editAction} />)

    fireEvent.click(screen.getByTestId('edit-btn-msg-1'))
    fireEvent.change(screen.getByTestId('edit-textarea'), { target: { value: 'Updated' } })
    fireEvent.keyDown(screen.getByTestId('edit-textarea'), { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(screen.queryByTestId('edit-textarea')).not.toBeInTheDocument()
    })
  })

  it('shows inline error and keeps edit mode when action returns { error }', async () => {
    const editAction = vi.fn().mockResolvedValue({ error: 'Save failed' })
    render(<MessageList {...BASE_PROPS} editAction={editAction} />)

    fireEvent.click(screen.getByTestId('edit-btn-msg-1'))
    fireEvent.change(screen.getByTestId('edit-textarea'), { target: { value: 'Updated' } })
    fireEvent.keyDown(screen.getByTestId('edit-textarea'), { key: 'Enter', shiftKey: false })

    await waitFor(() => expect(screen.getByText('Save failed')).toBeInTheDocument())
    expect(screen.getByTestId('edit-textarea')).toBeInTheDocument()
  })

  it('does not crash and shows error when action throws (e.g. network error)', async () => {
    const editAction = vi.fn().mockRejectedValue(new Error('Network error'))
    render(<MessageList {...BASE_PROPS} editAction={editAction} />)

    fireEvent.click(screen.getByTestId('edit-btn-msg-1'))
    fireEvent.change(screen.getByTestId('edit-textarea'), { target: { value: 'Updated' } })

    await act(async () => {
      fireEvent.keyDown(screen.getByTestId('edit-textarea'), { key: 'Enter', shiftKey: false })
    })

    // Component must still be mounted — not crashed
    expect(screen.getByTestId('msg-msg-1')).toBeInTheDocument()
    // Error message must be surfaced in the UI
    await waitFor(() => expect(screen.getByText(/network error/i)).toBeInTheDocument())
  })

  it('does not call editAction and does not close edit mode when content is whitespace-only', async () => {
    const editAction = vi.fn().mockResolvedValue({ ok: true })
    render(<MessageList {...BASE_PROPS} editAction={editAction} />)

    fireEvent.click(screen.getByTestId('edit-btn-msg-1'))
    fireEvent.change(screen.getByTestId('edit-textarea'), { target: { value: '   ' } })
    fireEvent.keyDown(screen.getByTestId('edit-textarea'), { key: 'Enter', shiftKey: false })

    await new Promise(r => setTimeout(r, 50))
    expect(editAction).not.toHaveBeenCalled()
    expect(screen.getByTestId('edit-textarea')).toBeInTheDocument()
  })

  it('cancels edit mode when Escape is pressed', () => {
    render(<MessageList {...BASE_PROPS} />)

    fireEvent.click(screen.getByTestId('edit-btn-msg-1'))
    expect(screen.getByTestId('edit-textarea')).toBeInTheDocument()

    fireEvent.keyDown(screen.getByTestId('edit-textarea'), { key: 'Escape' })
    expect(screen.queryByTestId('edit-textarea')).not.toBeInTheDocument()
  })
})
