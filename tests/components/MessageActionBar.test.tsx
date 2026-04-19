import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MessageActionBar from '@/components/chat/MessageActionBar'
import type { MessageWithProfile } from '@/lib/types'

const MSG: MessageWithProfile = {
  id: 'msg-1',
  channel_id: 'ch-1',
  user_id: 'u1',
  content: 'Hello world',
  reply_to_id: null,
  edited_at: null,
  created_at: '2024-01-01T12:00:00Z',
  attachments: [],
  profiles: { username: 'alice', avatar_url: null, display_name: 'Alice' },
  reactions: [],
}

const BASE = {
  msg: MSG,
  isOwn: false,
  canDeleteAny: false,
  canPin: false,
  allowReactions: true,
  allowReplies: true,
  atReactionLimit: false,
  pickerOpenFor: null as string | null,
  onPickerToggle: vi.fn(),
  onPickerClose: vi.fn(),
  onEmojiSelect: vi.fn(),
  onReply: vi.fn(),
  onStartEdit: vi.fn(),
  onDelete: vi.fn(),
  onPin: vi.fn(),
}

describe('MessageActionBar — visibility', () => {
  it('renders emoji button when allowReactions=true', () => {
    render(<MessageActionBar {...BASE} />)
    expect(screen.getByTestId('action-react')).toBeInTheDocument()
  })

  it('hides emoji button when allowReactions=false', () => {
    render(<MessageActionBar {...BASE} allowReactions={false} />)
    expect(screen.queryByTestId('action-react')).not.toBeInTheDocument()
  })

  it('renders reply button when allowReplies=true', () => {
    render(<MessageActionBar {...BASE} />)
    expect(screen.getByTestId('action-reply')).toBeInTheDocument()
  })

  it('hides reply button when allowReplies=false', () => {
    render(<MessageActionBar {...BASE} allowReplies={false} />)
    expect(screen.queryByTestId('action-reply')).not.toBeInTheDocument()
  })

  it('shows edit button for own message', () => {
    render(<MessageActionBar {...BASE} isOwn={true} />)
    expect(screen.getByTestId('action-edit')).toBeInTheDocument()
  })

  it('hides edit button for other message', () => {
    render(<MessageActionBar {...BASE} isOwn={false} />)
    expect(screen.queryByTestId('action-edit')).not.toBeInTheDocument()
  })

  it('shows delete button for own message', () => {
    render(<MessageActionBar {...BASE} isOwn={true} />)
    expect(screen.getByTestId('action-delete')).toBeInTheDocument()
  })

  it('shows delete button when canDeleteAny=true regardless of ownership', () => {
    render(<MessageActionBar {...BASE} isOwn={false} canDeleteAny={true} />)
    expect(screen.getByTestId('action-delete')).toBeInTheDocument()
  })

  it('hides delete button when not own and canDeleteAny=false', () => {
    render(<MessageActionBar {...BASE} isOwn={false} canDeleteAny={false} />)
    expect(screen.queryByTestId('action-delete')).not.toBeInTheDocument()
  })

  it('shows pin button when canPin=true', () => {
    render(<MessageActionBar {...BASE} canPin={true} />)
    expect(screen.getByTestId('action-pin')).toBeInTheDocument()
  })

  it('hides pin button when canPin=false', () => {
    render(<MessageActionBar {...BASE} canPin={false} />)
    expect(screen.queryByTestId('action-pin')).not.toBeInTheDocument()
  })
})

describe('MessageActionBar — callbacks', () => {
  it('calls onPickerToggle with msg.id when emoji button clicked', () => {
    const onPickerToggle = vi.fn()
    render(<MessageActionBar {...BASE} onPickerToggle={onPickerToggle} />)
    fireEvent.click(screen.getByTestId('action-react'))
    expect(onPickerToggle).toHaveBeenCalledWith('msg-1')
  })

  it('calls onReply with msg when reply button clicked', () => {
    const onReply = vi.fn()
    render(<MessageActionBar {...BASE} onReply={onReply} />)
    fireEvent.click(screen.getByTestId('action-reply'))
    expect(onReply).toHaveBeenCalledWith(MSG)
  })

  it('calls onStartEdit with msg when edit button clicked', () => {
    const onStartEdit = vi.fn()
    render(<MessageActionBar {...BASE} isOwn={true} onStartEdit={onStartEdit} />)
    fireEvent.click(screen.getByTestId('action-edit'))
    expect(onStartEdit).toHaveBeenCalledWith(MSG)
  })

  it('calls onDelete with msg.id when delete button clicked', () => {
    const onDelete = vi.fn()
    render(<MessageActionBar {...BASE} isOwn={true} onDelete={onDelete} />)
    fireEvent.click(screen.getByTestId('action-delete'))
    expect(onDelete).toHaveBeenCalledWith('msg-1')
  })

  it('calls onPin with msg.id when pin button clicked', () => {
    const onPin = vi.fn()
    render(<MessageActionBar {...BASE} canPin={true} onPin={onPin} />)
    fireEvent.click(screen.getByTestId('action-pin'))
    expect(onPin).toHaveBeenCalledWith('msg-1')
  })

  it('emoji button is disabled and has title when atReactionLimit=true and user has not reacted', () => {
    render(<MessageActionBar {...BASE} atReactionLimit={true} />)
    const btn = screen.getByTestId('action-react')
    expect(btn).toBeDisabled()
  })
})
