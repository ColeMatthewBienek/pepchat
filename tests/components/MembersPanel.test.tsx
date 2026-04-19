import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import MembersPanel from '@/components/sidebar/MembersPanel'

vi.mock('next/dynamic', () => ({ default: () => () => null }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const assignRoleMock = vi.fn().mockResolvedValue({ ok: true })
const kickMemberMock = vi.fn().mockResolvedValue({ ok: true })
vi.mock('@/app/(app)/members/actions', () => ({
  assignRole: (...args: any[]) => assignRoleMock(...args),
  kickMember: (...args: any[]) => kickMemberMock(...args),
}))

// Mutable so tests can swap out the resolved data between calls
let fetchResult = {
  data: [
    { user_id: 'u1', group_id: 'grp-1', role: 'moderator', profiles: { username: 'alice', avatar_url: null } },
    { user_id: 'u2', group_id: 'grp-1', role: 'user',      profiles: { username: 'bob',   avatar_url: null } },
  ],
  error: null,
}

let realtimeCb: ((payload: any) => void) | null = null

const supabaseStub = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve(fetchResult)),
      })),
    })),
  })),
  channel: vi.fn(() => ({
    on: vi.fn((_evt: string, _filter: any, cb: (p: any) => void) => {
      realtimeCb = cb
      return { subscribe: vi.fn(() => ({})) }
    }),
  })),
  removeChannel: vi.fn(),
  rpc: vi.fn(),
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => supabaseStub,
}))

const BASE_PROPS = {
  groupId: 'grp-1',
  currentUserId: 'admin-u',
  currentUserRole: 'admin' as const,
}

describe('MembersPanel — role change regression', () => {
  beforeEach(() => {
    realtimeCb = null
    assignRoleMock.mockResolvedValue({ ok: true })
    kickMemberMock.mockResolvedValue({ ok: true })
    fetchResult = {
      data: [
        { user_id: 'u1', group_id: 'grp-1', role: 'moderator', profiles: { username: 'alice', avatar_url: null } },
        { user_id: 'u2', group_id: 'grp-1', role: 'user',      profiles: { username: 'bob',   avatar_url: null } },
      ],
      error: null,
    }
  })

  it('renders member list on mount', async () => {
    await act(async () => {
      render(<MembersPanel {...BASE_PROPS} />)
    })
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()
  })

  it('does not crash when realtime fires a role UPDATE', async () => {
    await act(async () => {
      render(<MembersPanel {...BASE_PROPS} />)
    })

    // The realtime callback triggers fetchMembers — swap the resolved data first
    fetchResult = {
      data: [
        { user_id: 'u1', group_id: 'grp-1', role: 'moderator', profiles: { username: 'alice', avatar_url: null } },
        { user_id: 'u2', group_id: 'grp-1', role: 'moderator', profiles: { username: 'bob',   avatar_url: null } },
      ],
      error: null,
    }

    await act(async () => {
      realtimeCb?.({ eventType: 'UPDATE', new: { user_id: 'u2', role: 'moderator', group_id: 'grp-1' } })
    })

    // Component must still be in the DOM — no crash
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()
  })

  it('renders role dropdown for non-admin members when viewer is admin', async () => {
    await act(async () => {
      render(<MembersPanel {...BASE_PROPS} />)
    })
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
  })

  it('does not throw TypeError when assignRole returns undefined (action throws)', async () => {
    assignRoleMock.mockResolvedValueOnce(undefined)

    await act(async () => {
      render(<MembersPanel {...BASE_PROPS} />)
    })

    await act(async () => {
      screen.getAllByRole('combobox')[0].dispatchEvent(new Event('change', { bubbles: true }))
    })

    // No crash — component stays in DOM
    expect(screen.getByText('alice')).toBeInTheDocument()
  })

  it('handles assignRole returning { error } without crashing', async () => {
    assignRoleMock.mockResolvedValueOnce({ error: 'Only admins can assign roles.' })

    await act(async () => {
      render(<MembersPanel {...BASE_PROPS} />)
    })

    await act(async () => {
      screen.getAllByRole('combobox')[0].dispatchEvent(new Event('change', { bubbles: true }))
    })

    // Component stays alive — no crash
    expect(screen.getByText('alice')).toBeInTheDocument()
  })
})
