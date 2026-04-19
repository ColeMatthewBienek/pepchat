import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GroupsSidebar from '@/components/sidebar/GroupsSidebar'
import type { Group } from '@/lib/types'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({}),
}))

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}))

const GROUPS: Group[] = [
  { id: 'grp-1', name: 'Alpha', description: null, icon_url: null, owner_id: 'u1', invite_code: 'aaa', created_at: '2024-01-01T00:00:00Z' },
  { id: 'grp-2', name: 'Beta',  description: null, icon_url: null, owner_id: 'u1', invite_code: 'bbb', created_at: '2024-01-01T00:00:00Z' },
]

const BASE_PROPS = {
  groups: GROUPS,
  currentUserId: 'u1',
  onCreateGroup: vi.fn(),
  onJoinGroup: vi.fn(),
}

describe('GroupsSidebar layout', () => {
  it('renders at 72px width', () => {
    render(<GroupsSidebar {...BASE_PROPS} />)
    const nav = screen.getByTestId('groups-sidebar')
    expect(nav).toHaveStyle({ width: '72px' })
  })

  it('renders a DMs home button', () => {
    render(<GroupsSidebar {...BASE_PROPS} />)
    expect(screen.getByTestId('dms-home-button')).toBeInTheDocument()
  })

  it('renders a tile for each group', () => {
    render(<GroupsSidebar {...BASE_PROPS} />)
    expect(screen.getByTestId('group-tile-grp-1')).toBeInTheDocument()
    expect(screen.getByTestId('group-tile-grp-2')).toBeInTheDocument()
  })

  it('group tile links to /groups/:id', () => {
    render(<GroupsSidebar {...BASE_PROPS} />)
    const tile = screen.getByTestId('group-tile-grp-1')
    const link = tile.closest('a') ?? tile.querySelector('a')
    expect(link).toHaveAttribute('href', '/groups/grp-1')
  })

  it('renders the create/join button', () => {
    render(<GroupsSidebar {...BASE_PROPS} />)
    expect(screen.getByTestId('create-join-button')).toBeInTheDocument()
  })

  it('calls onCreateGroup when create/join button is clicked', () => {
    const onCreateGroup = vi.fn()
    render(<GroupsSidebar {...BASE_PROPS} onCreateGroup={onCreateGroup} />)
    fireEvent.click(screen.getByTestId('create-join-button'))
    expect(onCreateGroup).toHaveBeenCalled()
  })

  it('shows tooltip for group on hover', () => {
    render(<GroupsSidebar {...BASE_PROPS} />)
    const tile = screen.getByTestId('group-tile-grp-1')
    fireEvent.mouseEnter(tile)
    expect(screen.getByTestId('tooltip-grp-1')).toHaveTextContent('Alpha')
  })

  it('hides tooltip after mouse leaves', () => {
    render(<GroupsSidebar {...BASE_PROPS} />)
    const tile = screen.getByTestId('group-tile-grp-1')
    fireEvent.mouseEnter(tile)
    fireEvent.mouseLeave(tile)
    expect(screen.queryByTestId('tooltip-grp-1')).not.toBeInTheDocument()
  })

  it('shows DMs home button as active when isDMActive is true', () => {
    render(<GroupsSidebar {...BASE_PROPS} isDMActive />)
    const btn = screen.getByTestId('dms-home-button')
    // Active state: gradient background
    expect(btn).toHaveStyle({ background: 'linear-gradient(145deg, #e08452, #c94a2a)' })
  })
})

describe('GroupsSidebar — touch navigation (pointerDown)', () => {
  it('fires onDMsHome on pointerdown with pointerType=touch (first tap)', () => {
    const onDMsHome = vi.fn()
    render(<GroupsSidebar {...BASE_PROPS} onDMsHome={onDMsHome} />)
    // Fire on the inner button — event bubbles to the outer div's onPointerDown
    fireEvent.pointerDown(screen.getByTestId('dms-home-button'), { pointerType: 'touch' })
    expect(onDMsHome).toHaveBeenCalled()
  })

  it('does NOT fire onDMsHome on pointerdown with pointerType=mouse (onClick handles mouse)', () => {
    const onDMsHome = vi.fn()
    render(<GroupsSidebar {...BASE_PROPS} onDMsHome={onDMsHome} />)
    fireEvent.pointerDown(screen.getByTestId('dms-home-button'), { pointerType: 'mouse' })
    expect(onDMsHome).not.toHaveBeenCalled()
  })

  it('fires onCreateGroup on pointerdown with pointerType=touch (first tap)', () => {
    const onCreateGroup = vi.fn()
    render(<GroupsSidebar {...BASE_PROPS} onCreateGroup={onCreateGroup} />)
    fireEvent.pointerDown(screen.getByTestId('create-join-tile'), { pointerType: 'touch' })
    expect(onCreateGroup).toHaveBeenCalled()
  })

  it('does NOT fire onCreateGroup on pointerdown with pointerType=mouse (onClick handles mouse)', () => {
    const onCreateGroup = vi.fn()
    render(<GroupsSidebar {...BASE_PROPS} onCreateGroup={onCreateGroup} />)
    fireEvent.pointerDown(screen.getByTestId('create-join-tile'), { pointerType: 'mouse' })
    expect(onCreateGroup).not.toHaveBeenCalled()
  })
})

describe('GroupsSidebar unread badges', () => {
  it('shows unread badge on group that is in unreadGroupIds', () => {
    render(<GroupsSidebar {...BASE_PROPS} unreadGroupIds={new Set(['grp-1'])} />)
    expect(screen.getByTestId('unread-badge-grp-1')).toBeInTheDocument()
  })

  it('does not show unread badge on group not in unreadGroupIds', () => {
    render(<GroupsSidebar {...BASE_PROPS} unreadGroupIds={new Set(['grp-1'])} />)
    expect(screen.queryByTestId('unread-badge-grp-2')).not.toBeInTheDocument()
  })

  it('does not show any badges when unreadGroupIds is empty', () => {
    render(<GroupsSidebar {...BASE_PROPS} unreadGroupIds={new Set()} />)
    expect(screen.queryByTestId('unread-badge-grp-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('unread-badge-grp-2')).not.toBeInTheDocument()
  })
})
