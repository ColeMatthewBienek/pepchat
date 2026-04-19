import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Avatar, { getAvatarColor } from '@/components/ui/Avatar'

const BASE_USER = { username: 'alice' }

describe('Avatar — photo mode', () => {
  it('renders a div with background-image when avatar_url is set', () => {
    const { container } = render(
      <Avatar user={{ username: 'alice', avatar_url: 'https://example.com/alice.jpg' }} size={40} />
    )
    const el = container.querySelector('[data-testid="avatar-photo"]') as HTMLElement
    expect(el).toBeInTheDocument()
    expect(el.style.backgroundImage).toContain('alice.jpg')
  })

  it('does not render initials when avatar_url is set', () => {
    render(<Avatar user={{ username: 'alice', avatar_url: 'https://example.com/alice.jpg' }} size={40} />)
    expect(screen.queryByTestId('avatar-initials')).not.toBeInTheDocument()
  })
})

describe('Avatar — initials mode', () => {
  it('shows initials when no avatar_url', () => {
    render(<Avatar user={{ username: 'alice', display_name: 'Bob' }} size={40} />)
    const el = screen.getByTestId('avatar-initials')
    expect(el).toBeInTheDocument()
    expect(el.textContent).toBe('BA')
  })

  it('uses first 2 letters of username when no display_name', () => {
    render(<Avatar user={{ username: 'charlie' }} size={40} />)
    expect(screen.getByTestId('avatar-initials').textContent).toBe('CH')
  })

  it('uses username_color as background when provided', () => {
    const { container } = render(
      <Avatar user={{ username: 'alice', username_color: '#c94a2a' }} size={40} />
    )
    const el = container.querySelector('[data-testid="avatar-initials"]') as HTMLElement
    expect(el.style.background).toBe('rgb(201, 74, 42)')
  })

  it('falls back to deterministic palette color when no username_color', () => {
    const { container } = render(<Avatar user={{ username: 'alice' }} size={40} />)
    const el = container.querySelector('[data-testid="avatar-initials"]') as HTMLElement
    expect(el.style.background).toBeTruthy()
  })
})

describe('Avatar — border radius', () => {
  it('applies squircle radius (Math.round(size * 0.34))', () => {
    const { container } = render(<Avatar user={BASE_USER} size={40} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.borderRadius).toBe(`${Math.round(40 * 0.34)}px`)
  })
})

describe('Avatar — status dot', () => {
  it('does not render a status dot by default', () => {
    render(<Avatar user={BASE_USER} size={40} />)
    expect(screen.queryByTestId('avatar-status')).not.toBeInTheDocument()
  })

  it('renders status dot when showStatus=true', () => {
    render(<Avatar user={BASE_USER} size={40} showStatus status="online" />)
    expect(screen.getByTestId('avatar-status')).toBeInTheDocument()
  })

  it('status dot has online color for online status', () => {
    const { container } = render(<Avatar user={BASE_USER} size={40} showStatus status="online" />)
    const dot = container.querySelector('[data-testid="avatar-status"]') as HTMLElement
    expect(dot.style.background).toBe('rgb(106, 160, 138)')
  })

  it('status dot has away color for away status', () => {
    const { container } = render(<Avatar user={BASE_USER} size={40} showStatus status="away" />)
    const dot = container.querySelector('[data-testid="avatar-status"]') as HTMLElement
    expect(dot.style.background).toBe('rgb(216, 154, 58)')
  })

  it('status dot has dnd color for dnd status', () => {
    const { container } = render(<Avatar user={BASE_USER} size={40} showStatus status="dnd" />)
    const dot = container.querySelector('[data-testid="avatar-status"]') as HTMLElement
    expect(dot.style.background).toBe('rgb(230, 84, 58)')
  })

  it('status dot has offline color for offline status', () => {
    const { container } = render(<Avatar user={BASE_USER} size={40} showStatus status="offline" />)
    const dot = container.querySelector('[data-testid="avatar-status"]') as HTMLElement
    expect(dot.style.background).toBe('rgb(107, 97, 88)')
  })
})

describe('getAvatarColor', () => {
  it('returns a color from the palette', () => {
    const palette = [
      '#c94a2a', '#b5623d', '#d89a3a', '#5a7a4a',
      '#6aa08a', '#4a6a85', '#7a4a6b', '#c070a0',
    ]
    expect(palette).toContain(getAvatarColor('alice'))
  })

  it('returns the same color for the same username', () => {
    expect(getAvatarColor('testuser')).toBe(getAvatarColor('testuser'))
  })

  it('returns different colors for different usernames', () => {
    // Not guaranteed but very likely with a decent hash
    const colors = new Set(['alice', 'bob', 'charlie', 'dave'].map(getAvatarColor))
    expect(colors.size).toBeGreaterThan(1)
  })
})
