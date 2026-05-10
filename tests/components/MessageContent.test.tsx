import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MessageContent } from '@/components/chat/MessageContent'

// DOMPurify is alias-mocked via vitest.config.ts

describe('MessageContent', () => {
  it('renders without crashing given plain text', () => {
    const { container } = render(<MessageContent content="hello world" />)
    expect(container.querySelector('.message-content')).toBeInTheDocument()
  })

  it('renders the message-content wrapper div', () => {
    const { container } = render(<MessageContent content="test" />)
    const wrapper = container.querySelector('.message-content')
    expect(wrapper).not.toBeNull()
  })

  it('renders markdown bold text as <strong>', () => {
    const { container } = render(<MessageContent content="**bold text**" />)
    expect(container.querySelector('strong')).toBeInTheDocument()
  })

  it('renders markdown italic text as <em>', () => {
    const { container } = render(<MessageContent content="_italic_" />)
    expect(container.querySelector('em')).toBeInTheDocument()
  })

  it('renders links with target=_blank', () => {
    const { container } = render(<MessageContent content="[click](https://example.com)" />)
    const link = container.querySelector('a')
    expect(link).toBeInTheDocument()
    expect(link?.getAttribute('target')).toBe('_blank')
  })

  it('highlights username mentions', () => {
    const { container } = render(<MessageContent content="hello @bob" />)
    const mention = container.querySelector('.mention-token')
    expect(mention).toHaveTextContent('@bob')
  })

  it('returns null when isEditing is true', () => {
    const { container } = render(<MessageContent content="hello" isEditing />)
    expect(container.firstChild).toBeNull()
  })

  it('does not render the wrapper when isEditing', () => {
    const { container } = render(<MessageContent content="**bold**" isEditing={true} />)
    expect(container.querySelector('.message-content')).toBeNull()
  })

  it('does not crash on empty string', () => {
    expect(() => render(<MessageContent content="" />)).not.toThrow()
  })

  it('does not render <script> tags from content (XSS protection)', () => {
    const { container } = render(
      <MessageContent content={'<script>alert("xss")</script>'} />
    )
    expect(container.querySelector('script')).toBeNull()
    expect(container.innerHTML).not.toContain('alert("xss")')
  })
})
