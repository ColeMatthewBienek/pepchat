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
