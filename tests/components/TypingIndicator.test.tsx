import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TypingIndicator from '@/components/chat/TypingIndicator'

describe('TypingIndicator — no one typing', () => {
  it('renders a placeholder without typing text', () => {
    render(<TypingIndicator typingUsernames={[]} />)
    expect(screen.queryByTestId('typing-text')).not.toBeInTheDocument()
  })

  it('does not render typing dots when empty', () => {
    render(<TypingIndicator typingUsernames={[]} />)
    expect(screen.queryByTestId('typing-dot')).not.toBeInTheDocument()
  })
})

describe('TypingIndicator — someone typing', () => {
  it('renders typing text for one user', () => {
    render(<TypingIndicator typingUsernames={['alice']} />)
    expect(screen.getByTestId('typing-text')).toHaveTextContent('alice is typing')
  })

  it('renders typing text for two users', () => {
    render(<TypingIndicator typingUsernames={['alice', 'bob']} />)
    expect(screen.getByTestId('typing-text')).toHaveTextContent('alice and bob are typing')
  })

  it('renders "Several people are typing" for 3+ users', () => {
    render(<TypingIndicator typingUsernames={['a', 'b', 'c']} />)
    expect(screen.getByTestId('typing-text')).toHaveTextContent('Several people are typing')
  })

  it('renders exactly 3 bouncing dots', () => {
    render(<TypingIndicator typingUsernames={['alice']} />)
    expect(screen.getAllByTestId('typing-dot')).toHaveLength(3)
  })
})
