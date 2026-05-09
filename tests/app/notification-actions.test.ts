import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteNotificationSubscription,
  getNotificationPreferences,
  saveNotificationSubscription,
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
  const resolved = Promise.resolve({
    data: result.data ?? null,
    error: result.error ?? null,
  })
  builder.upsert = vi.fn(() => builder)
  builder.select = vi.fn(() => builder)
  builder.single = vi.fn().mockResolvedValue({
    data: result.data ?? null,
    error: result.error ?? null,
  })
  builder.then = resolved.then.bind(resolved)
  return builder
}

function makeDeleteBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {}
  builder.delete = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  ;(builder.eq as ReturnType<typeof vi.fn>).mockReturnValueOnce(builder).mockResolvedValueOnce({
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

const SUBSCRIPTION = {
  endpoint: 'https://push.example/subscription-1',
  keys: {
    p256dh: 'p256dh-key',
    auth: 'auth-secret',
  },
  user_agent: 'Vitest Browser',
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

describe('notification actions — saveNotificationSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated users', async () => {
    setupClient(makeUpsertBuilder({}), null)

    await expect(saveNotificationSubscription(SUBSCRIPTION)).resolves.toEqual({
      error: 'Not authenticated.',
    })
  })

  it('rejects invalid subscriptions', async () => {
    setupClient(makeUpsertBuilder({}))

    await expect(saveNotificationSubscription({
      endpoint: '',
      keys: { p256dh: 'key', auth: 'secret' },
    })).resolves.toEqual({ error: 'Invalid push subscription.' })
  })

  it('upserts the browser push subscription for the current user', async () => {
    const builder = makeUpsertBuilder({})
    const { from } = setupClient(builder)

    await expect(saveNotificationSubscription(SUBSCRIPTION)).resolves.toEqual({ ok: true })

    expect(from).toHaveBeenCalledWith('notification_subscriptions')
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        endpoint: SUBSCRIPTION.endpoint,
        p256dh: SUBSCRIPTION.keys.p256dh,
        auth: SUBSCRIPTION.keys.auth,
        user_agent: SUBSCRIPTION.user_agent,
        updated_at: expect.any(String),
      }),
      { onConflict: 'endpoint' }
    )
  })

  it('surfaces subscription save errors', async () => {
    setupClient(makeUpsertBuilder({ error: { message: 'Subscription failed' } }))

    await expect(saveNotificationSubscription(SUBSCRIPTION)).resolves.toEqual({
      error: 'Subscription failed',
    })
  })
})

describe('notification actions — deleteNotificationSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated users', async () => {
    setupClient(makeDeleteBuilder({}), null)

    await expect(deleteNotificationSubscription(SUBSCRIPTION.endpoint)).resolves.toEqual({
      error: 'Not authenticated.',
    })
  })

  it('deletes the current user subscription by endpoint', async () => {
    const builder = makeDeleteBuilder({})
    setupClient(builder)

    await expect(deleteNotificationSubscription(SUBSCRIPTION.endpoint)).resolves.toEqual({ ok: true })

    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'user_id', 'user-1')
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'endpoint', SUBSCRIPTION.endpoint)
  })

  it('surfaces subscription delete errors', async () => {
    setupClient(makeDeleteBuilder({ error: { message: 'Delete failed' } }))

    await expect(deleteNotificationSubscription(SUBSCRIPTION.endpoint)).resolves.toEqual({
      error: 'Delete failed',
    })
  })
})
