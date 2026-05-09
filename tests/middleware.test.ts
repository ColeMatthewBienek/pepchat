// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'

const { mockCreateServerClient } = vi.hoisted(() => ({ mockCreateServerClient: vi.fn() }))

vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}))

function makeRequest(path: string) {
  return new NextRequest(new URL(path, 'https://pepchat.test'))
}

function makeProfileBuilder(profile: unknown) {
  const builder: Record<string, unknown> = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.single = vi.fn().mockResolvedValue({ data: profile, error: null })
  return builder
}

function setupSupabase(userId: string | null, profile: unknown = { id: userId }) {
  const profileBuilder = makeProfileBuilder(profile)
  const from = vi.fn(() => profileBuilder)

  mockCreateServerClient.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
    from,
  })

  return { from, profileBuilder }
}

describe('middleware invite return paths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preserves protected invite paths for unauthenticated users', async () => {
    setupSupabase(null)

    const response = await middleware(makeRequest('/join/invite-123'))

    expect(response.headers.get('location')).toBe(
      'https://pepchat.test/login?next=%2Fjoin%2Finvite-123',
    )
  })

  it('redirects authenticated users without profiles to setup with the current path', async () => {
    const { from } = setupSupabase('user-1', null)

    const response = await middleware(makeRequest('/join/invite-123'))

    expect(from).toHaveBeenCalledWith('profiles')
    expect(response.headers.get('location')).toBe(
      'https://pepchat.test/setup-profile?next=%2Fjoin%2Finvite-123',
    )
  })

  it('sends authenticated login visitors with profiles to a safe next path', async () => {
    setupSupabase('user-1')

    const response = await middleware(makeRequest('/login?next=/join/invite-123'))

    expect(response.headers.get('location')).toBe('https://pepchat.test/join/invite-123')
  })

  it('preserves query strings on safe next paths', async () => {
    setupSupabase('user-1')

    const response = await middleware(makeRequest('/login?next=/channels?dm=conversation-1'))

    expect(response.headers.get('location')).toBe('https://pepchat.test/channels?dm=conversation-1')
  })

  it('ignores unsafe next paths for authenticated login visitors', async () => {
    setupSupabase('user-1')

    const response = await middleware(makeRequest('/login?next=//evil.example'))

    expect(response.headers.get('location')).toBe('https://pepchat.test/channels')
  })
})
