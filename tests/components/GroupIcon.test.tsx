import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

import GroupIcon from '@/components/ui/GroupIcon'

const BASE_GROUP = { id: 'g1', name: 'Alpha', icon_url: null }

describe('GroupIcon — fallback bubble', () => {
  it('renders a bubble with initials when no icon_url', () => {
    render(<GroupIcon group={BASE_GROUP} />)
    expect(screen.getByTestId('group-icon-bubble')).toBeInTheDocument()
    expect(screen.queryByTestId('group-icon-photo')).toBeNull()
  })

  it('shows glyph/initials text in the bubble', () => {
    render(<GroupIcon group={BASE_GROUP} />)
    expect(screen.getByTestId('group-icon-bubble')).toHaveTextContent('AL')
  })

  it('renders emoji glyph when name starts with emoji', () => {
    render(<GroupIcon group={{ ...BASE_GROUP, name: '🚀 Rockets' }} />)
    expect(screen.getByTestId('group-icon-bubble')).toHaveTextContent('🚀')
  })

  it('applies active ring to bubble when active=true', () => {
    render(<GroupIcon group={BASE_GROUP} active />)
    const bubble = screen.getByTestId('group-icon-bubble')
    expect(bubble.style.boxShadow).toContain('var(--accent)')
  })

  it('does not apply active ring when active=false', () => {
    render(<GroupIcon group={BASE_GROUP} active={false} />)
    const bubble = screen.getByTestId('group-icon-bubble')
    expect(bubble.style.boxShadow).not.toContain('0 0 0 2px var(--accent)')
  })
})

describe('GroupIcon — photo', () => {
  const GROUP_WITH_PHOTO = { ...BASE_GROUP, icon_url: 'https://example.com/icon.png' }

  it('renders photo div when icon_url is set', () => {
    render(<GroupIcon group={GROUP_WITH_PHOTO} />)
    expect(screen.getByTestId('group-icon-photo')).toBeInTheDocument()
    expect(screen.queryByTestId('group-icon-bubble')).toBeNull()
  })

  it('uses the icon_url as background-image', () => {
    render(<GroupIcon group={GROUP_WITH_PHOTO} />)
    const photo = screen.getByTestId('group-icon-photo')
    expect(photo).toHaveStyle({ backgroundImage: `url(${GROUP_WITH_PHOTO.icon_url})` })
  })

  it('applies active ring to photo when active=true', () => {
    render(<GroupIcon group={GROUP_WITH_PHOTO} active />)
    const photo = screen.getByTestId('group-icon-photo')
    expect(photo.style.boxShadow).toContain('var(--accent)')
  })
})

describe('GroupIcon — sizing', () => {
  it('defaults to 44px', () => {
    render(<GroupIcon group={BASE_GROUP} />)
    const wrapper = screen.getByTestId('group-icon-root')
    expect(wrapper).toHaveStyle({ width: '44px', height: '44px' })
  })

  it('respects custom size', () => {
    render(<GroupIcon group={BASE_GROUP} size={72} />)
    const wrapper = screen.getByTestId('group-icon-root')
    expect(wrapper).toHaveStyle({ width: '72px', height: '72px' })
  })
})
