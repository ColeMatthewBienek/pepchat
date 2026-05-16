import { describe, expect, it, vi, beforeEach } from 'vitest'
import { withAuth } from '@/lib/actions/withAuth'

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

describe('withAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls the body when user is authenticated', async () => {
    const user = { id: 'user-1', email: 'test@example.com' }
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
    })

    const body = vi.fn().mockResolvedValue({ success: true })

    const action = withAuth(body, {
      unauthenticated: () => ({ error: 'Not authenticated.' }),
    })

    const result = await action('arg1', 42)

    expect(body).toHaveBeenCalledWith(
      expect.objectContaining({ user }),
      'arg1',
      42
    )
    expect(result).toEqual({ success: true })
  })

  it('calls unauthenticated handler when there is no user', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    })

    const body = vi.fn()
    const unauthenticated = vi.fn().mockReturnValue({ error: 'Not authenticated.' })

    const action = withAuth(body, { unauthenticated })

    const result = await action('arg1')

    expect(body).not.toHaveBeenCalled()
    expect(unauthenticated).toHaveBeenCalled()
    expect(result).toEqual({ error: 'Not authenticated.' })
  })

  it('forwards unauthenticated handler that calls redirect', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    })

    const redirectFn = vi.fn()

    const action = withAuth(
      vi.fn(),
      { unauthenticated: redirectFn }
    )

    await action()
    expect(redirectFn).toHaveBeenCalled()
  })

  it('passes through args correctly', async () => {
    const user = { id: 'abc' }
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
    })

    const capturedArgs: unknown[][] = []
    const body = vi.fn(function (...args: unknown[]) {
      capturedArgs.push(args.slice(1)) // slice off the ctx
      return Promise.resolve({ ok: true })
    })

    const action = withAuth(body, {
      unauthenticated: () => ({ error: 'missing' }),
    })

    await action(1, 'two', { three: true })
    expect(capturedArgs).toEqual([[1, 'two', { three: true }]])
  })
})
