import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createGroup, leaveGroup, removeGroupIcon } from '@/app/(app)/groups/actions'

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  }),
}))

type QueryResult = { data?: unknown; error?: { message: string } | null }

function makeInsertSelectBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {}
  builder.insert = vi.fn(() => builder)
  builder.select = vi.fn(() => builder)
  builder.single = vi.fn().mockResolvedValue({
    data: result.data ?? null,
    error: result.error ?? null,
  })
  return builder
}

function makeInsertBuilder(result: QueryResult = {}) {
  const builder: Record<string, unknown> = {}
  builder.insert = vi.fn(() => Promise.resolve({
    data: result.data ?? null,
    error: result.error ?? null,
  }))
  return builder
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

function makeDeleteBuilder(result: QueryResult = {}) {
  const builder: Record<string, unknown> = {}
  builder.delete = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(resolve, reject)
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

function setupClient(builders: Record<string, unknown>[], options: {
  storage?: Record<string, unknown>
  userId?: string | null
} = {}) {
  let index = 0
  const from = vi.fn(() => {
    const builder = builders[index]
    index += 1
    return builder
  })

  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.userId === null ? null : { id: options.userId ?? 'user-1' } },
        error: null,
      }),
    },
    from,
    storage: options.storage,
  })

  return { from }
}

function groupForm(name = 'Test Group') {
  const formData = new FormData()
  formData.set('name', name)
  return formData
}

describe('group actions — createGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('surfaces member seed errors after creating a group', async () => {
    const group = makeInsertSelectBuilder({ data: { id: 'group-1' } })
    const member = makeInsertBuilder({ error: { message: 'Member seed failed' } })
    const channels = makeInsertBuilder()
    setupClient([group, member, channels])

    await expect(createGroup(groupForm())).resolves.toEqual({
      error: 'Member seed failed',
    })

    expect(channels.insert).not.toHaveBeenCalled()
  })

  it('surfaces channel seed errors after creating a group member', async () => {
    const group = makeInsertSelectBuilder({ data: { id: 'group-1' } })
    const member = makeInsertBuilder()
    const channels = makeInsertBuilder({ error: { message: 'Channel seed failed' } })
    setupClient([group, member, channels])

    await expect(createGroup(groupForm())).resolves.toEqual({
      error: 'Channel seed failed',
    })
  })
})

describe('group actions — leaveGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('surfaces membership delete errors before redirecting', async () => {
    const membership = makeSelectBuilder({ data: { role: 'user' } })
    const deletion = makeDeleteBuilder({ error: { message: 'Leave failed' } })
    setupClient([membership, deletion])

    await expect(leaveGroup('group-1')).resolves.toEqual({
      error: 'Leave failed',
    })
  })
})

describe('group actions — removeGroupIcon', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('surfaces storage list errors before updating the group', async () => {
    const membership = makeSelectBuilder({ data: { role: 'admin' } })
    const update = makeUpdateBuilder()
    const avatars = {
      list: vi.fn().mockResolvedValue({ data: null, error: { message: 'List failed' } }),
      remove: vi.fn(),
    }
    const storage = { from: vi.fn(() => avatars) }
    setupClient([membership, update], { storage })

    await expect(removeGroupIcon('group-1')).resolves.toEqual({
      error: 'List failed',
    })

    expect(update.update).not.toHaveBeenCalled()
  })

  it('surfaces storage remove errors before clearing the group icon', async () => {
    const membership = makeSelectBuilder({ data: { role: 'admin' } })
    const update = makeUpdateBuilder()
    const avatars = {
      list: vi.fn().mockResolvedValue({ data: [{ name: 'icon.png' }], error: null }),
      remove: vi.fn().mockResolvedValue({ error: { message: 'Remove failed' } }),
    }
    const storage = { from: vi.fn(() => avatars) }
    setupClient([membership, update], { storage })

    await expect(removeGroupIcon('group-1')).resolves.toEqual({
      error: 'Remove failed',
    })

    expect(avatars.remove).toHaveBeenCalledWith(['groups/group-1/icon.png'])
    expect(update.update).not.toHaveBeenCalled()
  })
})
