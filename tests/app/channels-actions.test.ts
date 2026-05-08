import { beforeEach, describe, expect, it, vi } from 'vitest'
import { moveChannel } from '@/app/(app)/channels/actions'

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

type QueryResult = { data?: unknown; error?: { message: string } | null }

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

function makeUpdateBuilder(result: QueryResult = {}) {
  const builder: Record<string, unknown> = {}
  builder.update = vi.fn(() => builder)
  builder.eq = vi.fn(() => Promise.resolve({
    data: result.data ?? null,
    error: result.error ?? null,
  }))
  return builder
}

function setupClient(builders: Record<string, unknown>[], userId: string | null = 'user-1') {
  let index = 0
  const from = vi.fn(() => {
    const builder = builders[index]
    index += 1
    return builder
  })

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

describe('channel actions — moveChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('swaps the selected channel with the adjacent channel', async () => {
    const channel = makeSelectBuilder({ data: { id: 'ch-2', group_id: 'group-1', position: 1 } })
    const adjacent = makeSelectBuilder({ data: { id: 'ch-1', position: 0 } })
    const channelUpdate = makeUpdateBuilder()
    const adjacentUpdate = makeUpdateBuilder()
    setupClient([channel, adjacent, channelUpdate, adjacentUpdate])

    await expect(moveChannel('ch-2', 'up')).resolves.toBeUndefined()

    expect(channelUpdate.update).toHaveBeenCalledWith({ position: 0 })
    expect(channelUpdate.eq).toHaveBeenCalledWith('id', 'ch-2')
    expect(adjacentUpdate.update).toHaveBeenCalledWith({ position: 1 })
    expect(adjacentUpdate.eq).toHaveBeenCalledWith('id', 'ch-1')
  })

  it('returns without updating when there is no adjacent channel', async () => {
    const channel = makeSelectBuilder({ data: { id: 'ch-1', group_id: 'group-1', position: 0 } })
    const adjacent = makeSelectBuilder({ data: null })
    const update = makeUpdateBuilder()
    setupClient([channel, adjacent, update])

    await expect(moveChannel('ch-1', 'up')).resolves.toBeUndefined()

    expect(update.update).not.toHaveBeenCalled()
  })

  it('surfaces selected channel lookup errors', async () => {
    const channel = makeSelectBuilder({ error: { message: 'Channel lookup failed' } })
    const adjacent = makeSelectBuilder({ data: { id: 'ch-1', position: 0 } })
    setupClient([channel, adjacent])

    await expect(moveChannel('ch-2', 'up')).resolves.toEqual({
      error: 'Channel lookup failed',
    })
  })

  it('surfaces adjacent channel lookup errors', async () => {
    const channel = makeSelectBuilder({ data: { id: 'ch-2', group_id: 'group-1', position: 1 } })
    const adjacent = makeSelectBuilder({ error: { message: 'Adjacent lookup failed' } })
    const update = makeUpdateBuilder()
    setupClient([channel, adjacent, update])

    await expect(moveChannel('ch-2', 'up')).resolves.toEqual({
      error: 'Adjacent lookup failed',
    })

    expect(update.update).not.toHaveBeenCalled()
  })

  it('surfaces update errors before applying the second update', async () => {
    const channel = makeSelectBuilder({ data: { id: 'ch-2', group_id: 'group-1', position: 1 } })
    const adjacent = makeSelectBuilder({ data: { id: 'ch-1', position: 0 } })
    const channelUpdate = makeUpdateBuilder({ error: { message: 'First update failed' } })
    const adjacentUpdate = makeUpdateBuilder()
    setupClient([channel, adjacent, channelUpdate, adjacentUpdate])

    await expect(moveChannel('ch-2', 'up')).resolves.toEqual({
      error: 'First update failed',
    })

    expect(adjacentUpdate.update).not.toHaveBeenCalled()
  })
})
