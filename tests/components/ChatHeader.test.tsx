import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChatHeader from '@/components/chat/ChatHeader'

vi.mock('@/lib/context/MobileSidebarContext', () => ({
  useMobileSidebar: () => ({ open: vi.fn() }),
}))

describe('ChatHeader', () => {
  it('has 56px height', () => {
    const { container } = render(<ChatHeader channelName="general" />)
    const header = container.firstElementChild as HTMLElement
    expect(header).toHaveStyle({ height: '56px' })
  })

  it('renders channel name', () => {
    render(<ChatHeader channelName="general" />)
    expect(screen.getByTestId('chat-header-name')).toHaveTextContent('general')
  })

  it('renders topic when provided', () => {
    render(<ChatHeader channelName="general" channelTopic="All things general" />)
    expect(screen.getByTestId('chat-header-topic')).toHaveTextContent('All things general')
  })

  it('does not render topic when not provided', () => {
    render(<ChatHeader channelName="general" />)
    expect(screen.queryByTestId('chat-header-topic')).not.toBeInTheDocument()
  })

  it('does not render topic when topic is null', () => {
    render(<ChatHeader channelName="general" channelTopic={null} />)
    expect(screen.queryByTestId('chat-header-topic')).not.toBeInTheDocument()
  })

  it('renders mobile menu button', () => {
    render(<ChatHeader channelName="general" />)
    expect(screen.getByTestId('mobile-menu-btn')).toBeInTheDocument()
  })
})
