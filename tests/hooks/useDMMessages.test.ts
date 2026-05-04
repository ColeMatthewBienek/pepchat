import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { useDMMessages } from '@/lib/hooks/useDMs'
import { DM_MESSAGE } from '@/tests/fixtures'

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ createClient: mockCreateClient }))

function makeBuilder(data: unknown) {
  const b: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'lt', 'order', 'limit', 'single']) {
    b[method] = vi.fn(() => b)
  }
  b.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve)
  return b
}

function setupMock(messages: unknown[] = [DM_MESSAGE]) {
  const channel = {
    on: vi.fn(() => channel),
    subscribe: vi.fn(() => channel),
  }
  mockCreateClient.mockReturnValue({
    from: vi.fn(() => makeBuilder(messages)),
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
  })
}

describe('useDMMessages', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('removes a message from local DM state', async () => {
    setupMock()
    const { result } = renderHook(() => useDMMessages(DM_MESSAGE.conversation_id))

    await waitFor(() => expect(result.current.messages).toHaveLength(1))

    act(() => {
      result.current.removeMessage(DM_MESSAGE.id)
    })

    expect(result.current.messages).toHaveLength(0)
  })

  it('updates message content in local DM state', async () => {
    setupMock()
    const { result } = renderHook(() => useDMMessages(DM_MESSAGE.conversation_id))

    await waitFor(() => expect(result.current.messages[0]?.content).toBe(DM_MESSAGE.content))

    act(() => {
      result.current.updateMessageContent(DM_MESSAGE.id, 'Updated DM')
    })

    expect(result.current.messages[0]).toMatchObject({
      id: DM_MESSAGE.id,
      content: 'Updated DM',
    })
    expect(result.current.messages[0]?.edited_at).toEqual(expect.any(String))
  })

  it('adds a sent message without duplicating existing entries', async () => {
    setupMock()
    const { result } = renderHook(() => useDMMessages(DM_MESSAGE.conversation_id))

    await waitFor(() => expect(result.current.messages).toHaveLength(1))

    act(() => {
      result.current.addMessage(DM_MESSAGE)
    })

    expect(result.current.messages).toHaveLength(1)
  })
})
