import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChannelsSidebar from '@/components/sidebar/ChannelsSidebar'
import type { Channel, Group, Profile } from '@/lib/types'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ channelId: 'ch-active' }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}))

vi.mock('@/app/(auth)/actions', () => ({ logout: vi.fn() }))
vi.mock('@/app/(app)/channels/actions', () => ({
  deleteChannel: vi.fn(),
  moveChannel: vi.fn(),
}))

const GROUP: Group = {
  id: 'grp-1', name: 'Design', description: 'Design team discussion', icon_url: null,
  owner_id: 'u1', invite_code: 'abc', created_at: '2024-01-01T00:00:00Z',
}

const GROUP_NO_DESC: Group = {
  id: 'grp-2', name: 'General', description: null, icon_url: null,
  owner_id: 'u1', invite_code: 'xyz', created_at: '2024-01-01T00:00:00Z',
}

const PROFILE: Profile = {
  id: 'u1', username: 'alice', display_name: 'Alice Smith', avatar_url: null,
  bio: null, location: null, website: null, username_color: '#fff',
  banner_color: '#5865f2', badge: null, pronouns: null,
  member_since: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
}

const PROFILE_NO_DISPLAY: Profile = {
  ...PROFILE, display_name: null,
}

const CHANNELS: Channel[] = [
  { id: 'ch-active', group_id: 'grp-1', name: 'general',       description: null, position: 0, created_at: '2024-01-01T00:00:00Z' },
  { id: 'ch-unread', group_id: 'grp-1', name: 'announcements', description: null, position: 1, created_at: '2024-01-01T00:00:00Z' },
  { id: 'ch-read',   group_id: 'grp-1', name: 'random',        description: null, position: 2, created_at: '2024-01-01T00:00:00Z' },
]

const BASE_PROPS = {
  group: GROUP,
  channels: CHANNELS,
  profile: PROFILE,
  userRole: 'user' as const,
}

describe('ChannelsSidebar layout', () => {
  it('renders at 236px width', () => {
    const { container } = render(<ChannelsSidebar {...BASE_PROPS} />)
    const sidebar = container.firstElementChild as HTMLElement
    expect(sidebar).toHaveStyle({ width: '236px' })
  })

  it('shows group name in header', () => {
    render(<ChannelsSidebar {...BASE_PROPS} />)
    expect(screen.getByTestId('group-header-name')).toHaveTextContent('Design')
  })

  it('shows group description when present', () => {
    render(<ChannelsSidebar {...BASE_PROPS} />)
    expect(screen.getByTestId('group-header-desc')).toHaveTextContent('Design team discussion')
  })

  it('does not render description when group has no description', () => {
    render(<ChannelsSidebar {...BASE_PROPS} group={GROUP_NO_DESC} />)
    expect(screen.queryByTestId('group-header-desc')).not.toBeInTheDocument()
  })

  it('shows settings gear for admin', () => {
    render(<ChannelsSidebar {...BASE_PROPS} userRole="admin" />)
    expect(screen.getByTestId('group-settings-btn')).toBeInTheDocument()
  })

  it('does not show settings gear for user', () => {
    render(<ChannelsSidebar {...BASE_PROPS} userRole="user" />)
    expect(screen.queryByTestId('group-settings-btn')).not.toBeInTheDocument()
  })

  it('shows create channel button for admin', () => {
    render(<ChannelsSidebar {...BASE_PROPS} userRole="admin" />)
    expect(screen.getByTestId('create-channel-btn')).toBeInTheDocument()
  })

  it('shows create channel button for moderator', () => {
    render(<ChannelsSidebar {...BASE_PROPS} userRole="moderator" />)
    expect(screen.getByTestId('create-channel-btn')).toBeInTheDocument()
  })

  it('does not show create channel button for user', () => {
    render(<ChannelsSidebar {...BASE_PROPS} userRole="user" />)
    expect(screen.queryByTestId('create-channel-btn')).not.toBeInTheDocument()
  })
})

describe('ChannelsSidebar channel rows', () => {
  it('shows dot indicator for unread channel', () => {
    render(<ChannelsSidebar {...BASE_PROPS} unreadChannelIds={new Set(['ch-unread'])} />)
    expect(screen.getByTestId('unread-dot-ch-unread')).toBeInTheDocument()
  })

  it('does not show dot indicator for read channel', () => {
    render(<ChannelsSidebar {...BASE_PROPS} unreadChannelIds={new Set(['ch-unread'])} />)
    expect(screen.queryByTestId('unread-dot-ch-read')).not.toBeInTheDocument()
  })

  it('does not show dot indicator on active channel even if unread', () => {
    render(<ChannelsSidebar {...BASE_PROPS} unreadChannelIds={new Set(['ch-active'])} />)
    expect(screen.queryByTestId('unread-dot-ch-active')).not.toBeInTheDocument()
  })

  it('unread channel link has font-medium class', () => {
    render(<ChannelsSidebar {...BASE_PROPS} unreadChannelIds={new Set(['ch-unread'])} />)
    const link = screen.getByRole('link', { name: /announcements/i })
    expect(link).toHaveClass('font-medium')
  })

  it('read channel link does not have font-medium class', () => {
    render(<ChannelsSidebar {...BASE_PROPS} unreadChannelIds={new Set()} />)
    const link = screen.getByRole('link', { name: /random/i })
    expect(link).not.toHaveClass('font-medium')
  })

  it('shows unread count when provided', () => {
    render(
      <ChannelsSidebar
        {...BASE_PROPS}
        unreadChannelIds={new Set(['ch-unread'])}
        unreadCountsByChannelId={new Map([['ch-unread', 3]])}
      />
    )
    expect(screen.getByTestId('unread-count-ch-unread')).toHaveTextContent('3')
  })

  it('caps unread count at 99+', () => {
    render(
      <ChannelsSidebar
        {...BASE_PROPS}
        unreadChannelIds={new Set(['ch-unread'])}
        unreadCountsByChannelId={new Map([['ch-unread', 120]])}
      />
    )
    expect(screen.getByTestId('unread-count-ch-unread')).toHaveTextContent('99+')
  })

  it('filters channels by name and description', () => {
    render(
      <ChannelsSidebar
        {...BASE_PROPS}
        channels={[
          CHANNELS[0],
          { ...CHANNELS[1], description: 'Release notes and updates' },
          CHANNELS[2],
        ]}
      />
    )

    fireEvent.change(screen.getByTestId('channel-search-input'), { target: { value: 'announce' } })

    expect(screen.getByRole('link', { name: /announcements/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /general/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /random/i })).not.toBeInTheDocument()

    fireEvent.change(screen.getByTestId('channel-search-input'), { target: { value: 'release notes' } })

    expect(screen.getByRole('link', { name: /announcements/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /general/i })).not.toBeInTheDocument()
  })

  it('clears the channel search', () => {
    render(<ChannelsSidebar {...BASE_PROPS} />)

    const searchInput = screen.getByTestId('channel-search-input')
    fireEvent.change(searchInput, { target: { value: 'random' } })

    expect(screen.getByRole('link', { name: /random/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /general/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('channel-search-clear'))

    expect(searchInput).toHaveValue('')
    expect(screen.getByRole('link', { name: /general/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /announcements/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /random/i })).toBeInTheDocument()
    expect(screen.queryByTestId('channel-search-clear')).not.toBeInTheDocument()
  })

  it('shows an empty channel search state when no channels match', () => {
    render(<ChannelsSidebar {...BASE_PROPS} />)

    fireEvent.change(screen.getByTestId('channel-search-input'), { target: { value: 'zzznomatch' } })

    expect(screen.getByText('No channels match your search.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /general/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /announcements/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /random/i })).not.toBeInTheDocument()
  })

  it('calls onMarkChannelRead from unread row action', () => {
    const onMarkChannelRead = vi.fn()
    render(
      <ChannelsSidebar
        {...BASE_PROPS}
        unreadChannelIds={new Set(['ch-unread'])}
        onMarkChannelRead={onMarkChannelRead}
      />
    )

    fireEvent.click(screen.getByTestId('mark-read-ch-unread'))

    expect(onMarkChannelRead).toHaveBeenCalledWith('ch-unread')
  })

  it('calls onMarkChannelUnread from read row action', () => {
    const onMarkChannelUnread = vi.fn()
    render(<ChannelsSidebar {...BASE_PROPS} onMarkChannelUnread={onMarkChannelUnread} />)

    fireEvent.click(screen.getByTestId('mark-unread-ch-read'))

    expect(onMarkChannelUnread).toHaveBeenCalledWith('ch-read')
  })
})

describe('ChannelsSidebar user footer', () => {
  it('shows display name in footer', () => {
    render(<ChannelsSidebar {...BASE_PROPS} />)
    expect(screen.getByTestId('user-footer-name')).toHaveTextContent('Alice Smith')
  })

  it('falls back to username when no display name', () => {
    render(<ChannelsSidebar {...BASE_PROPS} profile={PROFILE_NO_DISPLAY} />)
    expect(screen.getByTestId('user-footer-name')).toHaveTextContent('alice')
  })

  it('shows online status indicator', () => {
    render(<ChannelsSidebar {...BASE_PROPS} />)
    expect(screen.getByTestId('user-footer-status')).toBeInTheDocument()
  })
})
