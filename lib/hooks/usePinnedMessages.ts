'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PinnedMessage } from '@/lib/types'

const PINNED_SELECT = `
  id, channel_id, message_id, pinned_by_id, system_message_id, pinned_at,
  message:messages!pinned_messages_message_id_fkey(
    id, content, created_at, user_id,
    profiles(username, display_name, avatar_url, username_color)
  )
`

interface UsePinnedMessagesReturn {
  pinnedMessages: PinnedMessage[]
  pinnedCount: number
  refetch: () => Promise<void>
}

export function usePinnedMessages(channelId: string): UsePinnedMessagesReturn {
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([])
  const supabase = useRef(createClient()).current

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from('pinned_messages')
      .select(PINNED_SELECT)
      .eq('channel_id', channelId)
      .order('pinned_at', { ascending: false })
    if (data) setPinnedMessages(data as unknown as PinnedMessage[])
  }, [channelId, supabase])

  useEffect(() => {
    refetch()

    const room = supabase
      .channel(`pinned-${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pinned_messages' },
        ({ new: row }) => {
          // No server-side filter (requires REPLICA IDENTITY FULL); filter client-side
          if ((row as any).channel_id !== channelId) return
          // Refetch to get the full record with message + profile joins
          refetch()
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'pinned_messages' },
        ({ old: row }) => {
          setPinnedMessages(prev => prev.filter(p => p.id !== (row as any).id))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(room) }
  }, [channelId, supabase, refetch])

  return { pinnedMessages, pinnedCount: pinnedMessages.length, refetch }
}
