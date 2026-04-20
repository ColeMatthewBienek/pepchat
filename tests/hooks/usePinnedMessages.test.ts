import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePinnedMessages } from '@/lib/hooks/usePinnedMessages'
import type { PinnedMessage } from '@/lib/types'

const PIN: PinnedMessage = {
  id: 'pin-1',
  channel_id: 'ch-1',
  message_id: 'msg-1',
  pinned_by_id: 'u1',
  system_message_id: 'sys-1',
  pinned_at: '2024-04-18T12:00:00Z',
  message: {
    id: 'msg-1',
    content: 'Hello',
    created_at: '2024-04-18T11:00:00Z',
    user_id: 'u1',
    profiles: { username: 'alice', display_name: null, avatar_url: null, username_color: '#fff' },
  },
}

// Mutable handler store so tests can fire realtime events
let insertHandler: ((payload: any) => void) | null = null
let deleteHandler: ((payload: any) => void) | null = null

const mockChannel: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> } = {
  on: vi.fn().mockImplementation((_type: string, opts: any, handler: (p: any) => void) => {
    if (opts.event === 'INSERT') insertHandler = handler
    if (opts.event === 'DELETE') deleteHandler = handler
    return mockChannel
  }),
  subscribe: vi.fn().mockImplementation(() => mockChannel),
}

const mockSelect = vi.fn()
const mockSupabase = {
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: vi.fn(),
  from: vi.fn().mockReturnValue({
    select: mockSelect,
  }),
}

vi.mock('@/lib/supabase/client', () => ({ createClient: () => mockSupabase }))

beforeEach(() => {
  vi.clearAllMocks()
  insertHandler = null
  deleteHandler = null
  // Default: initial fetch returns [PIN]
  mockSelect.mockReturnValue({
    eq: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: [PIN], error: null }),
    }),
  })
})

describe('usePinnedMessages — initial fetch', () => {
  it('returns empty array before fetch resolves', () => {
    // Make fetch hang
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue(new Promise(() => {})),
      }),
    })
    const { result } = renderHook(() => usePinnedMessages('ch-1'))
    expect(result.current.pinnedMessages).toEqual([])
    expect(result.current.pinnedCount).toBe(0)
  })

  it('populates pinnedMessages after fetch', async () => {
    const { result } = renderHook(() => usePinnedMessages('ch-1'))
    await waitFor(() => expect(result.current.pinnedMessages).toHaveLength(1))
    expect(result.current.pinnedMessages[0].id).toBe('pin-1')
    expect(result.current.pinnedCount).toBe(1)
  })

  it('returns empty array when fetch returns empty', async () => {
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })
    const { result } = renderHook(() => usePinnedMessages('ch-1'))
    await waitFor(() => expect(result.current.pinnedMessages).toEqual([]))
    expect(result.current.pinnedCount).toBe(0)
  })
})

describe('usePinnedMessages — realtime INSERT', () => {
  it('adds new pin to state when INSERT fires', async () => {
    const { result } = renderHook(() => usePinnedMessages('ch-1'))
    await waitFor(() => expect(result.current.pinnedMessages).toHaveLength(1))

    const newPin: PinnedMessage = { ...PIN, id: 'pin-2', message_id: 'msg-2' }
    act(() => { insertHandler?.({ new: newPin }) })
    expect(result.current.pinnedMessages).toHaveLength(2)
    expect(result.current.pinnedMessages[0].id).toBe('pin-2')
  })

  it('does not duplicate on repeated INSERT of same id', async () => {
    const { result } = renderHook(() => usePinnedMessages('ch-1'))
    await waitFor(() => expect(result.current.pinnedMessages).toHaveLength(1))

    act(() => { insertHandler?.({ new: PIN }) })
    expect(result.current.pinnedMessages).toHaveLength(1)
  })
})

describe('usePinnedMessages — realtime DELETE', () => {
  it('removes pin from state when DELETE fires', async () => {
    const { result } = renderHook(() => usePinnedMessages('ch-1'))
    await waitFor(() => expect(result.current.pinnedMessages).toHaveLength(1))

    act(() => { deleteHandler?.({ old: { id: 'pin-1' } }) })
    expect(result.current.pinnedMessages).toHaveLength(0)
    expect(result.current.pinnedCount).toBe(0)
  })

  it('is a no-op for unknown pin id', async () => {
    const { result } = renderHook(() => usePinnedMessages('ch-1'))
    await waitFor(() => expect(result.current.pinnedMessages).toHaveLength(1))

    act(() => { deleteHandler?.({ old: { id: 'nonexistent' } }) })
    expect(result.current.pinnedMessages).toHaveLength(1)
  })
})

describe('usePinnedMessages — cleanup', () => {
  it('removes the realtime channel on unmount', async () => {
    const { unmount } = renderHook(() => usePinnedMessages('ch-1'))
    await waitFor(() => expect(mockSupabase.channel).toHaveBeenCalled())
    unmount()
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
  })
})
