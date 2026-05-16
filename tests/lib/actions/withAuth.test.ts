import { beforeEach, describe, expect, it, vi } from 'vitest'
import { withAuth } from '@/lib/actions/withAuth'

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

describe('withAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes one Supabase client and user into the authenticated body', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
    }
    mockCreateClient.mockResolvedValue(supabase)
    const body = vi.fn().mockResolvedValue({ ok: true })

    const action = withAuth(body, { unauthenticated: () => ({ error: 'Not authenticated.' }) })

    await expect(action('group-1')).resolves.toEqual({ ok: true })
    expect(mockCreateClient).toHaveBeenCalledTimes(1)
    expect(body).toHaveBeenCalledWith({ supabase, user: { id: 'user-1' } }, 'group-1')
  })

  it('returns the action-provided unauthenticated result', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    }
    mockCreateClient.mockResolvedValue(supabase)
    const body = vi.fn().mockResolvedValue({ ok: true })

    const action = withAuth(body, { unauthenticated: () => ({ redirectTo: '/login' }) })

    await expect(action()).resolves.toEqual({ redirectTo: '/login' })
  })

  it('does not call the body when unauthenticated', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    }
    mockCreateClient.mockResolvedValue(supabase)
    const body = vi.fn().mockResolvedValue({ ok: true })

    const action = withAuth(body, { unauthenticated: () => ({ error: 'Not authenticated.' }) })

    await action('group-1')
    expect(body).not.toHaveBeenCalled()
  })
})
