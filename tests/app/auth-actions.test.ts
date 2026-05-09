import { beforeEach, describe, expect, it, vi } from 'vitest'
import { login, setupProfile } from '@/app/(auth)/actions'

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

function makeInsertBuilder(result: QueryResult = {}) {
  const builder: Record<string, unknown> = {}
  builder.insert = vi.fn().mockResolvedValue({
    data: result.data ?? null,
    error: result.error ?? null,
  })
  return builder
}

function setupClient(builders: unknown[], userId: string | null = 'user-1') {
  let index = 0
  const from = vi.fn(() => {
    const builder = builders[index]
    index += 1
    return builder
  })

  mockCreateClient.mockResolvedValue({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
    from,
  })

  return { from }
}

function loginForm(next?: string) {
  const formData = new FormData()
  formData.set('email', 'user@example.com')
  formData.set('password', 'password')
  if (next) formData.set('next', next)
  return formData
}

function profileForm(username = 'alice', next?: string) {
  const formData = new FormData()
  formData.set('username', username)
  if (next) formData.set('next', next)
  return formData
}

describe('auth actions — invite return paths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects signed-in users to a safe next path', async () => {
    setupClient([makeSelectBuilder({ data: { id: 'user-1' } })])

    await expect(login(loginForm('/join/invite-123'))).rejects.toThrow('redirect:/join/invite-123')
  })

  it('does not redirect to unsafe external next paths', async () => {
    setupClient([makeSelectBuilder({ data: { id: 'user-1' } })])

    await expect(login(loginForm('//evil.example'))).rejects.toThrow('redirect:/channels')
  })

  it('preserves safe next path when profile setup is required after login', async () => {
    setupClient([makeSelectBuilder({ data: null })])

    await expect(login(loginForm('/join/invite-123'))).rejects.toThrow(
      'redirect:/setup-profile?next=%2Fjoin%2Finvite-123'
    )
  })

  it('redirects to safe next path after profile setup', async () => {
    setupClient([
      makeSelectBuilder({ data: null }),
      makeInsertBuilder(),
    ])

    await expect(setupProfile(profileForm('alice', '/join/invite-123'))).rejects.toThrow(
      'redirect:/join/invite-123'
    )
  })
})
