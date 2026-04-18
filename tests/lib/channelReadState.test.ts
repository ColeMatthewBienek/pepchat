import { describe, it, expect, vi, afterEach } from 'vitest'
import { markChannelRead } from '@/lib/channelReadState'

const mockUpsert = vi.fn().mockResolvedValue({ error: null })
const mockFrom   = vi.fn(() => ({ upsert: mockUpsert }))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: mockFrom }),
}))

describe('markChannelRead', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('calls upsert on channel_read_state with correct user_id and channel_id', async () => {
    await markChannelRead('ch-1', 'user-1')
    expect(mockFrom).toHaveBeenCalledWith('channel_read_state')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', channel_id: 'ch-1' }),
      expect.objectContaining({ onConflict: 'user_id,channel_id' })
    )
  })

  it('includes a last_read_at timestamp in the upsert payload', async () => {
    await markChannelRead('ch-1', 'user-1')
    const [payload] = mockUpsert.mock.calls[0]
    expect(typeof payload.last_read_at).toBe('string')
    expect(payload.last_read_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('resolves without throwing when supabase returns an error', async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: 'Permission denied' } })
    await expect(markChannelRead('ch-1', 'user-1')).resolves.toBeUndefined()
  })
})
