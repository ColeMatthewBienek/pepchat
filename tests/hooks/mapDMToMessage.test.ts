import { describe, it, expect, vi } from 'vitest'

// Prevent supabase/ssr from attempting browser-client setup during module load
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))

import { mapDMToMessage } from '@/lib/hooks/useDMs'
import { DM_MESSAGE, PROFILE_A, PROFILE_B } from '@/tests/fixtures'

describe('mapDMToMessage', () => {
  it('maps id correctly', () => {
    expect(mapDMToMessage(DM_MESSAGE).id).toBe(DM_MESSAGE.id)
  })

  it('maps conversation_id to channel_id', () => {
    expect(mapDMToMessage(DM_MESSAGE).channel_id).toBe(DM_MESSAGE.conversation_id)
  })

  it('maps sender_id to user_id', () => {
    expect(mapDMToMessage(DM_MESSAGE).user_id).toBe(DM_MESSAGE.sender_id)
  })

  it('maps content', () => {
    expect(mapDMToMessage(DM_MESSAGE).content).toBe(DM_MESSAGE.content)
  })

  it('maps edited_at', () => {
    expect(mapDMToMessage(DM_MESSAGE).edited_at).toBe(DM_MESSAGE.edited_at)
  })

  it('maps created_at', () => {
    expect(mapDMToMessage(DM_MESSAGE).created_at).toBe(DM_MESSAGE.created_at)
  })

  it('maps attachments from the DM', () => {
    expect(mapDMToMessage(DM_MESSAGE).attachments).toEqual(DM_MESSAGE.attachments)
  })

  it('sets reply_to_id to null (DMs have no replies)', () => {
    expect(mapDMToMessage(DM_MESSAGE).reply_to_id).toBeNull()
  })

  it('sets replied_to to null', () => {
    expect(mapDMToMessage(DM_MESSAGE).replied_to).toBeNull()
  })

  it('sets reactions to empty array', () => {
    expect(mapDMToMessage(DM_MESSAGE).reactions).toEqual([])
  })

  it('maps sender profile fields to profiles', () => {
    const { profiles } = mapDMToMessage(DM_MESSAGE)
    expect(profiles.username).toBe(PROFILE_A.username)
    expect(profiles.avatar_url).toBe(PROFILE_A.avatar_url)
    expect(profiles.display_name).toBe(PROFILE_A.display_name)
  })

  it('handles sender with null avatar_url', () => {
    const dm = { ...DM_MESSAGE, sender: { ...PROFILE_A, avatar_url: null } }
    expect(mapDMToMessage(dm).profiles.avatar_url).toBeNull()
  })

  it('handles sender with null display_name', () => {
    const dm = { ...DM_MESSAGE, sender: { ...PROFILE_A, display_name: null } }
    expect(mapDMToMessage(dm).profiles.display_name).toBeNull()
  })

  it('produces a complete MessageWithProfile shape', () => {
    const result = mapDMToMessage(DM_MESSAGE)
    // All required MessageWithProfile fields must be present
    const requiredKeys: (keyof typeof result)[] = [
      'id', 'channel_id', 'user_id', 'content', 'reply_to_id',
      'edited_at', 'created_at', 'attachments', 'profiles', 'reactions', 'replied_to',
    ]
    for (const key of requiredKeys) {
      expect(result).toHaveProperty(key)
    }
  })
})
