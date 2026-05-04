import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteDM, editDM } from '@/app/(app)/dm/actions'

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

type QueryResult = { data?: unknown; error?: { message: string } | null }

function makeBuilder(result: QueryResult = {}) {
  const builder: Record<string, unknown> = {
    _updates: [] as unknown[],
  }

  for (const method of ['select', 'eq', 'order', 'limit']) {
    builder[method] = vi.fn(() => builder)
  }

  builder.update = vi.fn((payload: unknown) => {
    ;(builder._updates as unknown[]).push(payload)
    return builder
  })
  builder.delete = vi.fn(() => builder)
  builder.single = vi.fn().mockResolvedValue({
    data: result.data ?? null,
    error: result.error ?? null,
  })
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(resolve, reject)

  return builder
}

function setupClient(builders: Record<string, unknown>[]) {
  let index = 0
  const from = vi.fn(() => {
    const builder = builders[index]
    index += 1
    return builder
  })

  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null }),
    },
    from,
  })

  return { from }
}

describe('DM actions — conversation preview maintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates the conversation preview after editing the latest DM', async () => {
    const editBuilder = makeBuilder({
      data: {
        id: 'dm-1',
        conversation_id: 'conv-1',
        content: 'Updated message',
        created_at: '2024-03-01T10:00:00Z',
      },
    })
    const latestBuilder = makeBuilder({
      data: {
        id: 'dm-1',
        conversation_id: 'conv-1',
        content: 'Updated message',
        created_at: '2024-03-01T10:00:00Z',
      },
    })
    const conversationBuilder = makeBuilder()

    setupClient([editBuilder, latestBuilder, conversationBuilder])

    await expect(editDM('dm-1', ' Updated message ')).resolves.toEqual({ ok: true })

    expect(conversationBuilder.update).toHaveBeenCalledWith({
      last_message: 'Updated message',
      last_message_at: '2024-03-01T10:00:00Z',
    })
    expect(conversationBuilder.eq).toHaveBeenCalledWith('id', 'conv-1')
  })

  it('falls back to the previous DM after deleting the latest DM', async () => {
    const targetBuilder = makeBuilder({ data: { id: 'dm-2', conversation_id: 'conv-1' } })
    const deleteBuilder = makeBuilder()
    const latestBuilder = makeBuilder({
      data: {
        id: 'dm-1',
        conversation_id: 'conv-1',
        content: 'Previous message',
        created_at: '2024-03-01T09:00:00Z',
      },
    })
    const conversationBuilder = makeBuilder()

    setupClient([targetBuilder, deleteBuilder, latestBuilder, conversationBuilder])

    await expect(deleteDM('dm-2')).resolves.toEqual({ ok: true })

    expect(conversationBuilder.update).toHaveBeenCalledWith({
      last_message: 'Previous message',
      last_message_at: '2024-03-01T09:00:00Z',
    })
    expect(conversationBuilder.eq).toHaveBeenCalledWith('id', 'conv-1')
  })

  it('clears the conversation preview after deleting the only DM', async () => {
    const targetBuilder = makeBuilder({ data: { id: 'dm-1', conversation_id: 'conv-1' } })
    const deleteBuilder = makeBuilder()
    const latestBuilder = makeBuilder({ data: null })
    const conversationBuilder = makeBuilder()

    setupClient([targetBuilder, deleteBuilder, latestBuilder, conversationBuilder])

    await expect(deleteDM('dm-1')).resolves.toEqual({ ok: true })

    expect(conversationBuilder.update).toHaveBeenCalledWith({
      last_message: null,
      last_message_at: null,
    })
  })
})
