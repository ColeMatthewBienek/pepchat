import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import MessageList from '@/components/chat/MessageList'
import type { MessageWithProfile } from '@/lib/types'

// Minimal Message mock — emits the same edit events as the real component
vi.mock('@/components/chat/Message', () => ({
  default: ({ msg, editingId, editContent, onStartEdit, onSubmitEdit, onCancelEdit, onEditContentChange, onOpenActions, onOpenContextMenu }: any) => {
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
          <>
            <button data-testid={`edit-btn-${msg.id}`} onClick={() => onStartEdit(msg)}>Edit</button>
            <button data-testid={`actions-btn-${msg.id}`} onClick={() => onOpenActions?.(msg)}>Actions</button>
            <button data-testid={`context-btn-${msg.id}`} onClick={() => onOpenContextMenu?.(msg, 100, 100)}>Context</button>
          </>
        )}
      </div>
    )
  },
}))

vi.mock('@/components/chat/SystemMessage', () => ({
  default: ({ msg, onOpenPinnedPanel }: any) => (
    <div data-testid={`system-msg-${msg.id}`}>
      <button data-testid="system-see-all" onClick={onOpenPinnedPanel}>See all</button>
    </div>
  ),
}))

vi.mock('next/dynamic', () => ({ default: () => () => null }))
vi.mock('@/app/(app)/messages/actions', () => ({
  editMessage: vi.fn(),
  deleteMessage: vi.fn(),
}))
vi.mock('@/app/admin/actions', () => ({
  reportMessage: vi.fn(),
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

const OTHER_MSG: MessageWithProfile = {
  ...MSG,
  id: 'msg-2',
  user_id: 'u2',
  content: 'Needs review',
  profiles: { username: 'bob', display_name: null, avatar_url: null },
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

  it('calls onEditSuccess with messageId and trimmed content when edit succeeds', async () => {
    const editAction = vi.fn().mockResolvedValue({ ok: true })
    const onEditSuccess = vi.fn()
    render(<MessageList {...BASE_PROPS} editAction={editAction} onEditSuccess={onEditSuccess} />)

    fireEvent.click(screen.getByTestId('edit-btn-msg-1'))
    fireEvent.change(screen.getByTestId('edit-textarea'), { target: { value: '  New content  ' } })
    fireEvent.keyDown(screen.getByTestId('edit-textarea'), { key: 'Enter', shiftKey: false })

    await waitFor(() => expect(onEditSuccess).toHaveBeenCalledWith('msg-1', '  New content  '))
  })

  it('does not call onEditSuccess when edit returns an error', async () => {
    const editAction = vi.fn().mockResolvedValue({ error: 'Failed' })
    const onEditSuccess = vi.fn()
    render(<MessageList {...BASE_PROPS} editAction={editAction} onEditSuccess={onEditSuccess} />)

    fireEvent.click(screen.getByTestId('edit-btn-msg-1'))
    fireEvent.change(screen.getByTestId('edit-textarea'), { target: { value: 'New content' } })
    fireEvent.keyDown(screen.getByTestId('edit-textarea'), { key: 'Enter', shiftKey: false })

    await waitFor(() => expect(screen.getByText('Failed')).toBeInTheDocument())
    expect(onEditSuccess).not.toHaveBeenCalled()
  })
})

const SYS_MSG: MessageWithProfile = {
  id: 'sys-1',
  user_id: 'u1',
  channel_id: 'ch-1',
  content: '',
  created_at: new Date().toISOString(),
  edited_at: null,
  reply_to_id: null,
  replied_to: null,
  attachments: [],
  reactions: [],
  profiles: { username: 'alice', display_name: null, avatar_url: null },
  is_system: true,
  system_type: 'pin',
  system_data: { pinned_by: 'Alice', message_id: 'msg-1' },
}

describe('MessageList — system messages', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders SystemMessage instead of Message for is_system=true', () => {
    render(<MessageList {...BASE_PROPS} messages={[SYS_MSG]} />)
    expect(screen.getByTestId('system-msg-sys-1')).toBeInTheDocument()
    expect(screen.queryByTestId('msg-sys-1')).not.toBeInTheDocument()
  })

  it('still renders normal Message for regular messages', () => {
    render(<MessageList {...BASE_PROPS} messages={[MSG]} />)
    expect(screen.getByTestId('msg-msg-1')).toBeInTheDocument()
    expect(screen.queryByTestId('system-msg-msg-1')).not.toBeInTheDocument()
  })

  it('passes onOpenPinnedPanel to SystemMessage', () => {
    const onOpenPinnedPanel = vi.fn()
    render(<MessageList {...BASE_PROPS} messages={[SYS_MSG]} onOpenPinnedPanel={onOpenPinnedPanel} />)
    fireEvent.click(screen.getByTestId('system-see-all'))
    expect(onOpenPinnedPanel).toHaveBeenCalledOnce()
  })

  it('can render a mix of regular and system messages', () => {
    render(<MessageList {...BASE_PROPS} messages={[MSG, SYS_MSG]} />)
    expect(screen.getByTestId('msg-msg-1')).toBeInTheDocument()
    expect(screen.getByTestId('system-msg-sys-1')).toBeInTheDocument()
  })
})

describe('MessageList — report message', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports another user message from the mobile action modal', async () => {
    const reportAction = vi.fn().mockResolvedValue({ ok: true })
    render(<MessageList {...BASE_PROPS} messages={[OTHER_MSG]} reportAction={reportAction} />)

    fireEvent.click(screen.getByTestId('actions-btn-msg-2'))
    fireEvent.click(screen.getByTestId('modal-action-report'))
    fireEvent.click(screen.getByTestId('report-reason-spam'))
    fireEvent.click(screen.getByTestId('report-submit'))

    await waitFor(() => expect(reportAction).toHaveBeenCalledWith('msg-2', 'Spam'))
  })

  it('reports another user message from the desktop context menu', async () => {
    const reportAction = vi.fn().mockResolvedValue({ ok: true })
    render(<MessageList {...BASE_PROPS} messages={[OTHER_MSG]} reportAction={reportAction} />)

    fireEvent.click(screen.getByTestId('context-btn-msg-2'))
    fireEvent.click(screen.getByText('Report Message'))
    fireEvent.change(screen.getByTestId('report-reason-input'), { target: { value: 'Custom reason' } })
    fireEvent.click(screen.getByTestId('report-submit'))

    await waitFor(() => expect(reportAction).toHaveBeenCalledWith('msg-2', 'Custom reason'))
  })

  it('does not show report action for own messages', () => {
    render(<MessageList {...BASE_PROPS} messages={[MSG]} />)

    fireEvent.click(screen.getByTestId('actions-btn-msg-1'))
    expect(screen.queryByTestId('modal-action-report')).not.toBeInTheDocument()
  })

  it('does not call reportAction when the dialog is cancelled', async () => {
    const reportAction = vi.fn().mockResolvedValue({ ok: true })
    render(<MessageList {...BASE_PROPS} messages={[OTHER_MSG]} reportAction={reportAction} />)

    fireEvent.click(screen.getByTestId('actions-btn-msg-2'))
    fireEvent.click(screen.getByTestId('modal-action-report'))
    fireEvent.click(screen.getByTestId('report-cancel'))

    await new Promise(r => setTimeout(r, 50))
    expect(reportAction).not.toHaveBeenCalled()
    expect(screen.queryByTestId('report-submit')).not.toBeInTheDocument()
  })

  it('shows inline error when reportAction fails', async () => {
    const reportAction = vi.fn().mockResolvedValue({ error: 'Report failed' })
    render(<MessageList {...BASE_PROPS} messages={[OTHER_MSG]} reportAction={reportAction} />)

    fireEvent.click(screen.getByTestId('actions-btn-msg-2'))
    fireEvent.click(screen.getByTestId('modal-action-report'))
    fireEvent.click(screen.getByTestId('report-reason-spam'))
    fireEvent.click(screen.getByTestId('report-submit'))

    await waitFor(() => expect(screen.getByText('Report failed')).toBeInTheDocument())
  })

  it('shows success feedback when reportAction succeeds', async () => {
    const reportAction = vi.fn().mockResolvedValue({ ok: true })
    render(<MessageList {...BASE_PROPS} messages={[OTHER_MSG]} reportAction={reportAction} />)

    fireEvent.click(screen.getByTestId('actions-btn-msg-2'))
    fireEvent.click(screen.getByTestId('modal-action-report'))
    fireEvent.click(screen.getByTestId('report-reason-spam'))
    fireEvent.click(screen.getByTestId('report-submit'))

    await waitFor(() => expect(screen.getByText('Report submitted for review.')).toBeInTheDocument())
    expect(screen.queryByTestId('report-submit')).not.toBeInTheDocument()
  })
})
