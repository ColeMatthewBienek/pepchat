import { beforeEach, describe, expect, it, vi } from 'vitest'
import { assignRole, kickMember } from '@/app/(app)/members/actions'

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

type QueryResult = { data?: unknown; error?: { message: string } | null }

function makeSingleBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.single = vi.fn().mockResolvedValue({
    data: result.data ?? null,
    error: result.error ?? null,
  })
  return builder
}

function makeMutationBuilder(result: QueryResult = {}) {
  const builder: Record<string, unknown> = {}
  builder.update = vi.fn(() => builder)
  builder.delete = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(resolve, reject)
  return builder
}

function makeAuditBuilder() {
  const builder: Record<string, unknown> = {}
  builder.insert = vi.fn().mockResolvedValue({ error: null })
  return builder
}

function setupClient(builders: Record<string, unknown>[], userId = 'admin-1') {
  let index = 0
  const from = vi.fn(() => {
    const builder = builders[index]
    index += 1
    return builder
  })

  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
    from,
  })

  return { from }
}

describe('member actions — membership guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not assign a role when the target member is missing', async () => {
    const caller = makeSingleBuilder({ data: { role: 'admin' } })
    const target = makeSingleBuilder({ data: null })
    const mutation = makeMutationBuilder()
    setupClient([caller, target, mutation])

    await expect(assignRole('group-1', 'missing-user', 'moderator')).resolves.toEqual({
      error: 'Target member was not found.',
    })

    expect(mutation.update).not.toHaveBeenCalled()
  })

  it('does not kick a member when the target member is missing', async () => {
    const caller = makeSingleBuilder({ data: { role: 'admin' } })
    const target = makeSingleBuilder({ data: null })
    const mutation = makeMutationBuilder()
    setupClient([caller, target, mutation])

    await expect(kickMember('group-1', 'missing-user')).resolves.toEqual({
      error: 'Target member was not found.',
    })

    expect(mutation.delete).not.toHaveBeenCalled()
  })

  it('surfaces caller membership lookup errors before assigning roles', async () => {
    const caller = makeSingleBuilder({ error: { message: 'Membership lookup failed' } })
    const target = makeSingleBuilder({ data: { role: 'user' } })
    const mutation = makeMutationBuilder()
    setupClient([caller, target, mutation])

    await expect(assignRole('group-1', 'user-1', 'moderator')).resolves.toEqual({
      error: 'Membership lookup failed',
    })

    expect(mutation.update).not.toHaveBeenCalled()
  })

  it('surfaces target membership lookup errors before kicking members', async () => {
    const caller = makeSingleBuilder({ data: { role: 'moderator' } })
    const target = makeSingleBuilder({ error: { message: 'Target lookup failed' } })
    const mutation = makeMutationBuilder()
    setupClient([caller, target, mutation])

    await expect(kickMember('group-1', 'user-1')).resolves.toEqual({
      error: 'Target lookup failed',
    })

    expect(mutation.delete).not.toHaveBeenCalled()
  })

  it('audits successful role assignments', async () => {
    const caller = makeSingleBuilder({ data: { role: 'admin' } })
    const target = makeSingleBuilder({ data: { role: 'user' } })
    const mutation = makeMutationBuilder()
    const audit = makeAuditBuilder()
    setupClient([caller, target, mutation, audit])

    await expect(assignRole('group-1', 'user-1', 'moderator')).resolves.toEqual({ ok: true })

    expect(audit.insert).toHaveBeenCalledWith(expect.objectContaining({
      admin_id: 'admin-1',
      action: 'member_role_changed',
      target_type: 'user',
      target_id: 'user-1',
      metadata: {
        group_id: 'group-1',
        from_role: 'user',
        to_role: 'moderator',
      },
    }))
  })

  it('audits successful member kicks', async () => {
    const caller = makeSingleBuilder({ data: { role: 'moderator' } })
    const target = makeSingleBuilder({ data: { role: 'noob' } })
    const mutation = makeMutationBuilder()
    const audit = makeAuditBuilder()
    setupClient([caller, target, mutation, audit], 'mod-1')

    await expect(kickMember('group-1', 'user-1')).resolves.toEqual({ ok: true })

    expect(audit.insert).toHaveBeenCalledWith(expect.objectContaining({
      admin_id: 'mod-1',
      action: 'member_kicked',
      target_type: 'user',
      target_id: 'user-1',
      metadata: {
        group_id: 'group-1',
        actor_role: 'moderator',
        target_role: 'noob',
      },
    }))
  })
})
