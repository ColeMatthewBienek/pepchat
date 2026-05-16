import { describe, expect, it, vi, beforeEach } from 'vitest'
import { gateGroupRole } from '@/lib/permissions/gate'

const mockSupabase = {
  from: vi.fn(),
}

describe('gateGroupRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReset()
  })

  it('returns gate error when membership lookup fails', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'DB connection error' },
      }),
    }

    mockSupabase.from.mockReturnValue(builder)

    const result = await gateGroupRole(mockSupabase as never, {
      groupId: 'group-1',
      userId: 'user-1',
      predicate: () => true,
      deniedMessage: 'Not allowed',
    })

    expect(result).toEqual({ error: 'DB connection error' })
  })

  it('returns denied message when user is not a member', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }

    mockSupabase.from.mockReturnValue(builder)

    const result = await gateGroupRole(mockSupabase as never, {
      groupId: 'group-1',
      userId: 'user-1',
      predicate: () => true,
      deniedMessage: 'Not a member of this group.',
    })

    expect(result).toEqual({ error: 'Not a member of this group.' })
  })

  it('returns denied message when role does not satisfy predicate', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: 'noob' },
        error: null,
      }),
    }

    mockSupabase.from.mockReturnValue(builder)

    const predicate = vi.fn(() => false)

    const result = await gateGroupRole(mockSupabase as never, {
      groupId: 'group-1',
      userId: 'user-1',
      predicate,
      deniedMessage: 'Insufficient permissions.',
    })

    expect(predicate).toHaveBeenCalledWith('noob')
    expect(result).toEqual({ error: 'Insufficient permissions.' })
  })

  it('returns ok with membership when role satisfies predicate', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      }),
    }

    mockSupabase.from.mockReturnValue(builder)

    const predicate = vi.fn(() => true)

    const result = await gateGroupRole(mockSupabase as never, {
      groupId: 'group-1',
      userId: 'user-1',
      predicate,
      deniedMessage: 'Insufficient permissions.',
    })

    expect(predicate).toHaveBeenCalledWith('admin')
    expect(result).toEqual({ ok: true, membership: { role: 'admin' } })
  })

  it('queries with correct group_id and user_id', async () => {
    const eqCalls: string[][] = []
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((col: string, val: string) => {
        eqCalls.push([col, val])
        return builder
      }),
      single: vi.fn().mockResolvedValue({
        data: { role: 'moderator' },
        error: null,
      }),
    }

    mockSupabase.from.mockReturnValue(builder)

    await gateGroupRole(mockSupabase as never, {
      groupId: 'special-group',
      userId: 'special-user',
      predicate: () => true,
      deniedMessage: 'Nope',
    })

    expect(eqCalls).toEqual([
      ['group_id', 'special-group'],
      ['user_id', 'special-user'],
    ])
  })
})
