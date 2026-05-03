import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import UserTable from '@/components/admin/UserTable'
import type { AdminUser } from '@/lib/types'

vi.mock('@/app/admin/actions', () => ({
  changeRole: vi.fn().mockResolvedValue({ ok: true }),
  banUser: vi.fn().mockResolvedValue({ ok: true }),
  unbanUser: vi.fn().mockResolvedValue({ ok: true }),
  resetPassword: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const USERS: AdminUser[] = [
  {
    id: 'u1',
    username: 'panicmonkey',
    display_name: 'PanicMonkey',
    avatar_url: null,
    role: 'admin',
    group_id: 'g1',
    joined_at: '2024-01-01T00:00:00Z',
    last_active: '2024-04-19T10:00:00Z',
    is_banned: false,
  },
  {
    id: 'u2',
    username: 'cool42',
    display_name: null,
    avatar_url: null,
    role: 'moderator',
    group_id: 'g1',
    joined_at: '2024-02-01T00:00:00Z',
    last_active: '2024-04-18T09:00:00Z',
    is_banned: false,
  },
  {
    id: 'u3',
    username: 'newbie',
    display_name: 'New Guy',
    avatar_url: null,
    role: 'user',
    group_id: 'g1',
    joined_at: '2024-03-01T00:00:00Z',
    last_active: null,
    is_banned: false,
  },
  {
    id: 'u4',
    username: 'banned_user',
    display_name: null,
    avatar_url: null,
    role: 'user',
    group_id: 'g1',
    joined_at: '2024-03-10T00:00:00Z',
    last_active: null,
    is_banned: true,
  },
]

const defaultProps = {
  users: USERS,
  currentUserId: 'u1',
}

beforeEach(() => vi.clearAllMocks())

describe('UserTable — rendering', () => {
  it('renders a .user-row for each user', () => {
    render(<UserTable {...defaultProps} />)
    expect(document.querySelectorAll('.user-row')).toHaveLength(USERS.length)
  })

  it('shows username in each row', () => {
    render(<UserTable {...defaultProps} />)
    expect(screen.getByText('@panicmonkey')).toBeTruthy()
    expect(screen.getByText('@cool42')).toBeTruthy()
  })

  it('shows display name when present', () => {
    render(<UserTable {...defaultProps} />)
    expect(screen.getByText('PanicMonkey')).toBeTruthy()
  })

  it('shows role pill for admin/mod', () => {
    render(<UserTable {...defaultProps} />)
    expect(document.querySelectorAll('[data-testid="role-pill"]').length).toBeGreaterThan(0)
  })

  it('shows Banned badge for banned users', () => {
    render(<UserTable {...defaultProps} />)
    expect(screen.getByText('Banned')).toBeTruthy()
  })

  it('shows Unban action for banned users', () => {
    render(<UserTable {...defaultProps} />)
    expect(screen.getByText('Unban User')).toBeTruthy()
  })
})

describe('UserTable — search', () => {
  it('has a search input with .user-search class', () => {
    render(<UserTable {...defaultProps} />)
    expect(document.querySelector('.user-search')).toBeTruthy()
  })

  it('filters rows by username', () => {
    render(<UserTable {...defaultProps} />)
    const search = document.querySelector('.user-search') as HTMLInputElement
    fireEvent.change(search, { target: { value: 'cool' } })
    expect(document.querySelectorAll('.user-row')).toHaveLength(1)
  })

  it('filters rows by display name', () => {
    render(<UserTable {...defaultProps} />)
    const search = document.querySelector('.user-search') as HTMLInputElement
    fireEvent.change(search, { target: { value: 'New Guy' } })
    expect(document.querySelectorAll('.user-row')).toHaveLength(1)
  })

  it('shows all rows when search is cleared', () => {
    render(<UserTable {...defaultProps} />)
    const search = document.querySelector('.user-search') as HTMLInputElement
    fireEvent.change(search, { target: { value: 'cool' } })
    fireEvent.change(search, { target: { value: '' } })
    expect(document.querySelectorAll('.user-row')).toHaveLength(USERS.length)
  })

  it('shows empty state when no matches', () => {
    render(<UserTable {...defaultProps} />)
    const search = document.querySelector('.user-search') as HTMLInputElement
    fireEvent.change(search, { target: { value: 'zzznomatch' } })
    expect(document.querySelectorAll('.user-row')).toHaveLength(0)
    expect(screen.getByText(/no users/i)).toBeTruthy()
  })
})

describe('UserTable — pagination', () => {
  it('shows prev/next buttons', () => {
    render(<UserTable {...defaultProps} />)
    expect(screen.getByText(/prev/i)).toBeTruthy()
    expect(screen.getByText(/next/i)).toBeTruthy()
  })

  it('prev button is disabled on first page', () => {
    render(<UserTable {...defaultProps} />)
    const prev = screen.getByText(/prev/i).closest('button')
    expect(prev).toBeDisabled()
  })

  it('shows at most 25 users per page', () => {
    const manyUsers: AdminUser[] = Array.from({ length: 30 }, (_, i) => ({
      ...USERS[0],
      id: `u${i}`,
      username: `user${i}`,
    }))
    render(<UserTable {...defaultProps} users={manyUsers} />)
    expect(document.querySelectorAll('.user-row').length).toBeLessThanOrEqual(25)
  })
})

describe('UserTable — access control', () => {
  it('does not show actions button for the current user (self)', () => {
    render(<UserTable {...defaultProps} currentUserId="u1" />)
    // u1 is panicmonkey — their row should not have an actions button
    const rows = document.querySelectorAll('.user-row')
    const selfRow = rows[0]
    expect(within(selfRow as HTMLElement).queryByTitle(/actions/i)).toBeNull()
  })

  it('does not allow demoting another admin', () => {
    // If all users passed are admins but current is also admin, cannot demote
    const adminUsers: AdminUser[] = [
      { ...USERS[0], id: 'u1', username: 'me', role: 'admin', group_id: 'g1' },
      { ...USERS[0], id: 'u2', username: 'other_admin', role: 'admin', group_id: 'g1' },
    ]
    render(<UserTable {...defaultProps} users={adminUsers} currentUserId="u1" />)
    expect(screen.queryByText('Change Role')).toBeNull()
  })
})

describe('UserTable — reset password', () => {
  it('shows Reset Password in the user actions menu', () => {
    render(<UserTable {...defaultProps} />)
    fireEvent.click(within(document.querySelectorAll('.user-row')[1] as HTMLElement).getByTitle(/actions/i))
    expect(screen.getByText('Reset Password')).toBeTruthy()
  })

  it('calls resetPassword with user id and username', async () => {
    const { resetPassword } = await import('@/app/admin/actions')
    render(<UserTable {...defaultProps} />)

    fireEvent.click(within(document.querySelectorAll('.user-row')[1] as HTMLElement).getByTitle(/actions/i))
    fireEvent.click(screen.getByText('Reset Password'))

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('u2', 'cool42'))
  })

  it('shows a success notice after sending a reset email', async () => {
    render(<UserTable {...defaultProps} />)

    fireEvent.click(within(document.querySelectorAll('.user-row')[1] as HTMLElement).getByTitle(/actions/i))
    fireEvent.click(screen.getByText('Reset Password'))

    await waitFor(() => expect(screen.getByText('Password reset email sent to @cool42.')).toBeInTheDocument())
  })
})

describe('UserTable — action feedback', () => {
  it('shows a success notice after role changes', async () => {
    render(<UserTable {...defaultProps} />)

    fireEvent.click(within(document.querySelectorAll('.user-row')[1] as HTMLElement).getByTitle(/actions/i))
    fireEvent.click(screen.getByText('user'))

    await waitFor(() => expect(screen.getByText('Updated @cool42 to user.')).toBeInTheDocument())
  })

  it('shows a success notice after banning a user', async () => {
    render(<UserTable {...defaultProps} />)

    fireEvent.click(within(document.querySelectorAll('.user-row')[2] as HTMLElement).getByTitle(/actions/i))
    fireEvent.click(screen.getByText('Ban User'))
    fireEvent.click(screen.getByTestId('confirm-ban-user'))

    await waitFor(() => expect(screen.getByText('Banned @newbie.')).toBeInTheDocument())
  })

  it('shows a success notice after unbanning a user', async () => {
    render(<UserTable {...defaultProps} />)

    fireEvent.click(screen.getByText('Unban User'))

    await waitFor(() => expect(screen.getByText('Unbanned @banned_user.')).toBeInTheDocument())
  })
})
