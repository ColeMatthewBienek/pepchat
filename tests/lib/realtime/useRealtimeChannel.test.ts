import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useRealtimeChannel, type RealtimeStatus } from '@/lib/realtime/useRealtimeChannel'

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ createClient: mockCreateClient }))

type BindingCall = { type: string; filter: Record<string, unknown>; handler: (payload: unknown) => void }
type TestChannel = {
  topic: string
  options?: Record<string, unknown>
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  send: ReturnType<typeof vi.fn>
  track: ReturnType<typeof vi.fn>
  presenceState: ReturnType<typeof vi.fn>
  bindings: BindingCall[]
  statusCallback?: (status: RealtimeStatus) => void
}

function makeRealtimeMock() {
  const channels: TestChannel[] = []
  const removeChannel = vi.fn().mockResolvedValue({ error: null })
  const channel = vi.fn((topic: string, options?: Record<string, unknown>) => {
    const ch: TestChannel = {
      topic,
      options,
      bindings: [],
      on: vi.fn((type: string, filter: Record<string, unknown>, handler: (payload: unknown) => void) => {
        ch.bindings.push({ type, filter, handler })
        return ch
      }),
      subscribe: vi.fn((statusCallback?: (status: RealtimeStatus) => void) => {
        ch.statusCallback = statusCallback
        return ch
      }),
      send: vi.fn(),
      track: vi.fn(),
      presenceState: vi.fn(() => ({})),
    }
    channels.push(ch)
    return ch
  })
  mockCreateClient.mockReturnValue({ channel, removeChannel })
  return { channel, channels, removeChannel }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useRealtimeChannel', () => {
  it('registers bindings in order, subscribes, dispatches payloads, and removes on unmount', () => {
    const realtime = makeRealtimeMock()
    const first = vi.fn()
    const second = vi.fn()

    const { result, unmount } = renderHook(() =>
      useRealtimeChannel({
        topic: 'messages-ch-1',
        deps: ['ch-1'],
        bindings: [
          { type: 'broadcast', filter: { event: 'new_message' }, handler: first },
          { type: 'postgres_changes', filter: { event: 'DELETE', schema: 'public', table: 'messages' }, handler: second },
        ],
      })
    )

    const channel = realtime.channels[0]
    expect(realtime.channel).toHaveBeenCalledWith('messages-ch-1')
    expect(channel.bindings.map(({ type, filter }) => ({ type, filter }))).toEqual([
      { type: 'broadcast', filter: { event: 'new_message' } },
      { type: 'postgres_changes', filter: { event: 'DELETE', schema: 'public', table: 'messages' } },
    ])
    expect(channel.subscribe).toHaveBeenCalledTimes(1)
    expect(result.current.channelRef.current).toBe(channel)

    const payload = { id: 'payload-1' }
    act(() => channel.bindings[0].handler(payload))
    expect(first).toHaveBeenCalledWith(payload)

    unmount()
    expect(realtime.removeChannel).toHaveBeenCalledTimes(1)
    expect(realtime.removeChannel).toHaveBeenCalledWith(channel)
    expect(result.current.channelRef.current).toBeNull()
  })

  it('removes the old channel and activates the new channel when deps change', () => {
    const realtime = makeRealtimeMock()
    const { result, rerender } = renderHook(
      ({ channelId }: { channelId: string }) =>
        useRealtimeChannel({ topic: `messages-${channelId}`, deps: [channelId], bindings: [] }),
      { initialProps: { channelId: 'ch-1' } }
    )

    const oldChannel = realtime.channels[0]
    rerender({ channelId: 'ch-2' })
    const newChannel = realtime.channels[1]

    expect(realtime.removeChannel).toHaveBeenCalledTimes(1)
    expect(realtime.removeChannel).toHaveBeenCalledWith(oldChannel)
    expect(newChannel.topic).toBe('messages-ch-2')
    expect(result.current.channelRef.current).toBe(newChannel)
  })

  it('captures named subscribe statuses and forwards them with the active channel', () => {
    const realtime = makeRealtimeMock()
    const onStatus = vi.fn()
    const { result } = renderHook(() =>
      useRealtimeChannel({ topic: 'presence-ch-1', deps: ['ch-1'], bindings: [], onStatus })
    )
    const channel = realtime.channels[0]

    for (const status of ['SUBSCRIBED', 'CHANNEL_ERROR', 'TIMED_OUT'] as const) {
      act(() => channel.statusCallback?.(status))
      expect(result.current.status).toBe(status)
      expect(onStatus).toHaveBeenLastCalledWith(status, channel)
    }
  })

  it('skips channel work when disabled and cleans up when rerendered disabled', () => {
    const realtime = makeRealtimeMock()
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useRealtimeChannel({ topic: 'messages-ch-1', enabled, deps: [enabled], bindings: [] }),
      { initialProps: { enabled: false } }
    )

    expect(realtime.channel).not.toHaveBeenCalled()
    expect(realtime.removeChannel).not.toHaveBeenCalled()
    expect(result.current.channelRef.current).toBeNull()

    rerender({ enabled: true })
    const active = realtime.channels[0]
    expect(active.topic).toBe('messages-ch-1')
    expect(result.current.channelRef.current).toBe(active)

    rerender({ enabled: false })
    expect(realtime.removeChannel).toHaveBeenCalledTimes(1)
    expect(realtime.removeChannel).toHaveBeenCalledWith(active)
    expect(result.current.channelRef.current).toBeNull()
  })
})
