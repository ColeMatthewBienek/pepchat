import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/app/(app)/notifications/actions'

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

type QueryResult = { data?: unknown; error?: { message: string; code?: string } | null }

function setupClient(builder: unknown, userId: string | null = 'user-1') {
  const from = vi.fn(() => builder)
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
    from,
  })
  return { from }
}

function makeSelectBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.single = vi.fn().mockResolvedValue({
    data: result.data ?? null,
    error: result.error ?? null,
  })
  return builder
}

function makeUpsertBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {}
  builder.upsert = vi.fn(() => builder)
  builder.select = vi.fn(() => builder)
  builder.single = vi.fn().mockResolvedValue({
    data: result.data ?? null,
    error: result.error ?? null,
  })
  return builder
}

const PREFERENCES = {
  user_id: 'user-1',
  dm_messages: true,
  mentions: true,
  group_messages: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

describe('notification actions — getNotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated users', async () => {
    setupClient(makeSelectBuilder({}), null)

    await expect(getNotificationPreferences()).resolves.toEqual({ error: 'Not authenticated.' })
  })

  it('returns stored preferences for the current user', async () => {
    const builder = makeSelectBuilder({ data: PREFERENCES })
    const { from } = setupClient(builder)

    await expect(getNotificationPreferences()).resolves.toEqual({
      ok: true,
      preferences: PREFERENCES,
    })

    expect(from).toHaveBeenCalledWith('notification_preferences')
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('returns default preferences when no row exists yet', async () => {
    setupClient(makeSelectBuilder({ error: { message: 'No rows', code: 'PGRST116' } }))

    const result = await getNotificationPreferences()

    expect(result).toMatchObject({
      ok: true,
      preferences: {
        user_id: 'user-1',
        dm_messages: true,
        mentions: true,
        group_messages: false,
      },
    })
  })

  it('surfaces select errors', async () => {
    setupClient(makeSelectBuilder({ error: { message: 'Read failed' } }))

    await expect(getNotificationPreferences()).resolves.toEqual({ error: 'Read failed' })
  })
})

describe('notification actions — updateNotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated users', async () => {
    setupClient(makeUpsertBuilder({}), null)

    await expect(updateNotificationPreferences({ dm_messages: false })).resolves.toEqual({
      error: 'Not authenticated.',
    })
  })

  it('upserts allowed preference fields for the current user', async () => {
    const builder = makeUpsertBuilder({ data: { ...PREFERENCES, dm_messages: false } })
    setupClient(builder)

    await expect(updateNotificationPreferences({ dm_messages: false })).resolves.toEqual({
      ok: true,
      preferences: { ...PREFERENCES, dm_messages: false },
    })

    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        dm_messages: false,
        updated_at: expect.any(String),
      }),
      { onConflict: 'user_id' }
    )
  })

  it('ignores unknown runtime fields', async () => {
    const builder = makeUpsertBuilder({ data: PREFERENCES })
    setupClient(builder)

    await updateNotificationPreferences({ dm_messages: true, unknown: false } as any)

    expect(builder.upsert).toHaveBeenCalledWith(
      expect.not.objectContaining({ unknown: false }),
      { onConflict: 'user_id' }
    )
  })

  it('surfaces upsert errors', async () => {
    setupClient(makeUpsertBuilder({ error: { message: 'Save failed' } }))

    await expect(updateNotificationPreferences({ mentions: false })).resolves.toEqual({
      error: 'Save failed',
    })
  })
})
