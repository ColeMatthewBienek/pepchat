import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PinnedMessagesPanel from '@/components/chat/PinnedMessagesPanel'
import type { PinnedMessage } from '@/lib/types'

const PIN: PinnedMessage = {
  id: 'pin-1',
  channel_id: 'ch-1',
  message_id: 'msg-1',
  pinned_by_id: 'u1',
  system_message_id: 'sys-1',
  pinned_at: '2024-04-18T12:00:00Z',
  message: {
    id: 'msg-1',
    content: 'Important announcement',
    created_at: '2024-04-18T11:00:00Z',
    user_id: 'u1',
    profiles: {
      username: 'alice',
      display_name: 'Alice',
      avatar_url: null,
      username_color: '#ffffff',
    },
  },
}

const BASE = {
  open: true,
  pinnedMessages: [PIN],
  canPin: false,
  onClose: vi.fn(),
  onJump: vi.fn(),
  onUnpin: vi.fn(),
}

describe('PinnedMessagesPanel — rendering', () => {
  it('renders nothing when open=false', () => {
    render(<PinnedMessagesPanel {...BASE} open={false} />)
    expect(screen.queryByTestId('pinned-panel')).not.toBeInTheDocument()
  })

  it('renders the panel when open=true', () => {
    render(<PinnedMessagesPanel {...BASE} />)
    expect(screen.getByTestId('pinned-panel')).toBeInTheDocument()
  })

  it('renders the panel header title', () => {
    render(<PinnedMessagesPanel {...BASE} />)
    expect(screen.getByTestId('pinned-panel-title')).toHaveTextContent('Pinned Messages')
  })

  it('renders a close button', () => {
    render(<PinnedMessagesPanel {...BASE} />)
    expect(screen.getByTestId('pinned-panel-close')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close pinned messages' })).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<PinnedMessagesPanel {...BASE} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('pinned-panel-close'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('PinnedMessagesPanel — pinned message cards', () => {
  it('renders a card for each pinned message', () => {
    render(<PinnedMessagesPanel {...BASE} />)
    expect(screen.getByTestId('pinned-card-pin-1')).toBeInTheDocument()
  })

  it('shows the message content in the card', () => {
    render(<PinnedMessagesPanel {...BASE} />)
    expect(screen.getByTestId('pinned-card-content-pin-1')).toHaveTextContent('Important announcement')
  })

  it('shows the author username', () => {
    render(<PinnedMessagesPanel {...BASE} />)
    expect(screen.getByTestId('pinned-card-author-pin-1')).toHaveTextContent('Alice')
  })

  it('renders a Jump button on each card', () => {
    render(<PinnedMessagesPanel {...BASE} />)
    expect(screen.getByTestId('pinned-jump-pin-1')).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Jump to pinned message from Alice: Important announcement',
      })
    ).toBeInTheDocument()
  })

  it('calls onJump with the message_id when Jump is clicked', () => {
    const onJump = vi.fn()
    render(<PinnedMessagesPanel {...BASE} onJump={onJump} />)
    fireEvent.click(screen.getByTestId('pinned-jump-pin-1'))
    expect(onJump).toHaveBeenCalledWith('msg-1')
  })
})

describe('PinnedMessagesPanel — unpin', () => {
  it('hides Unpin button when canPin=false', () => {
    render(<PinnedMessagesPanel {...BASE} canPin={false} />)
    expect(screen.queryByTestId('pinned-unpin-pin-1')).not.toBeInTheDocument()
  })

  it('shows Unpin button when canPin=true', () => {
    render(<PinnedMessagesPanel {...BASE} canPin={true} />)
    expect(screen.getByTestId('pinned-unpin-pin-1')).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Unpin message from Alice: Important announcement',
      })
    ).toBeInTheDocument()
  })

  it('calls onUnpin with the pin id when Unpin is clicked', () => {
    const onUnpin = vi.fn()
    render(<PinnedMessagesPanel {...BASE} canPin={true} onUnpin={onUnpin} />)
    fireEvent.click(screen.getByTestId('pinned-unpin-pin-1'))
    expect(onUnpin).toHaveBeenCalledWith('pin-1')
  })
})

describe('PinnedMessagesPanel — empty state', () => {
  it('shows empty state when no pinned messages', () => {
    render(<PinnedMessagesPanel {...BASE} pinnedMessages={[]} />)
    expect(screen.getByTestId('pinned-empty')).toBeInTheDocument()
  })

  it('does not show empty state when there are pins', () => {
    render(<PinnedMessagesPanel {...BASE} />)
    expect(screen.queryByTestId('pinned-empty')).not.toBeInTheDocument()
  })

  it('empty state contains helpful copy', () => {
    render(<PinnedMessagesPanel {...BASE} pinnedMessages={[]} />)
    expect(screen.getByTestId('pinned-empty')).toHaveTextContent('No pinned messages')
  })
})

describe('PinnedMessagesPanel — multiple pins', () => {
  const PIN2: PinnedMessage = {
    ...PIN,
    id: 'pin-2',
    message_id: 'msg-2',
    message: { ...PIN.message!, id: 'msg-2', content: 'Second pinned message' },
  }

  it('renders all pinned message cards', () => {
    render(<PinnedMessagesPanel {...BASE} pinnedMessages={[PIN, PIN2]} />)
    expect(screen.getByTestId('pinned-card-pin-1')).toBeInTheDocument()
    expect(screen.getByTestId('pinned-card-pin-2')).toBeInTheDocument()
  })

  it('each jump button calls onJump with its own message_id', () => {
    const onJump = vi.fn()
    render(<PinnedMessagesPanel {...BASE} pinnedMessages={[PIN, PIN2]} onJump={onJump} />)
    fireEvent.click(screen.getByTestId('pinned-jump-pin-2'))
    expect(onJump).toHaveBeenCalledWith('msg-2')
  })
})
