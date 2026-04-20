import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SystemMessage from '@/components/chat/SystemMessage'

const PIN_MSG = {
  id: 'sys-1',
  is_system: true,
  system_type: 'pin',
  system_data: { pinned_by: 'Alice', message_id: 'msg-42' },
}

describe('SystemMessage — pin', () => {
  it('renders the pinned-by username', () => {
    render(<SystemMessage msg={PIN_MSG as any} onOpenPinnedPanel={vi.fn()} />)
    expect(screen.getByTestId('system-message-pin')).toBeInTheDocument()
    expect(screen.getByTestId('system-pin-actor')).toHaveTextContent('Alice')
  })

  it('renders "pinned a message to this channel."', () => {
    render(<SystemMessage msg={PIN_MSG as any} onOpenPinnedPanel={vi.fn()} />)
    expect(screen.getByTestId('system-message-pin')).toHaveTextContent('pinned a message to this channel.')
  })

  it('renders a "See all pinned messages" button', () => {
    render(<SystemMessage msg={PIN_MSG as any} onOpenPinnedPanel={vi.fn()} />)
    expect(screen.getByTestId('system-pin-see-all')).toBeInTheDocument()
  })

  it('calls onOpenPinnedPanel when "See all" is clicked', () => {
    const onOpen = vi.fn()
    render(<SystemMessage msg={PIN_MSG as any} onOpenPinnedPanel={onOpen} />)
    fireEvent.click(screen.getByTestId('system-pin-see-all'))
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it('renders a pin SVG icon', () => {
    render(<SystemMessage msg={PIN_MSG as any} onOpenPinnedPanel={vi.fn()} />)
    expect(screen.getByTestId('system-pin-icon')).toBeInTheDocument()
  })

  it('renders nothing for unknown system_type', () => {
    render(
      <SystemMessage
        msg={{ ...PIN_MSG, system_type: 'unknown' } as any}
        onOpenPinnedPanel={vi.fn()}
      />
    )
    expect(screen.queryByTestId('system-message-pin')).not.toBeInTheDocument()
  })
})
