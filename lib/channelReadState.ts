'use client'

import { createClient } from '@/lib/supabase/client'

export async function markChannelRead(channelId: string, userId: string): Promise<void> {
  const supabase = createClient()
  await supabase
    .from('channel_read_state')
    .upsert(
      { user_id: userId, channel_id: channelId, last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,channel_id' }
    )
}

export async function markChannelUnreadFromMessage(
  channelId: string,
  userId: string,
  messageCreatedAt: string
): Promise<void> {
  const timestamp = new Date(messageCreatedAt).getTime()
  const lastReadAt = Number.isFinite(timestamp)
    ? new Date(Math.max(0, timestamp - 1)).toISOString()
    : new Date(0).toISOString()

  const supabase = createClient()
  await supabase
    .from('channel_read_state')
    .upsert(
      { user_id: userId, channel_id: channelId, last_read_at: lastReadAt },
      { onConflict: 'user_id,channel_id' }
    )
}
