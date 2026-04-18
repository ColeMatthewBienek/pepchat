import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import GroupsSidebar from '@/components/sidebar/GroupsSidebar'
import type { Group } from '@/lib/types'

// ─── Next.js mocks ────────────────────────────────────────────────────────────

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

// ─── Fixtures ─────────────────────────────────────────────────────────────────

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

describe('GroupsSidebar unread badge', () => {
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
