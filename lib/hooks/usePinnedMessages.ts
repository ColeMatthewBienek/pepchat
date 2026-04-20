'use client'

import { useEffect, useState } from 'react'
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
}

export function usePinnedMessages(channelId: string): UsePinnedMessagesReturn {
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([])

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from('pinned_messages')
      .select(PINNED_SELECT)
      .eq('channel_id', channelId)
      .order('pinned_at', { ascending: false })
      .then(({ data }) => {
        if (data) setPinnedMessages(data as unknown as PinnedMessage[])
      })

    const room = supabase
      .channel(`pinned-${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pinned_messages', filter: `channel_id=eq.${channelId}` },
        async ({ new: row }) => {
          // Raw INSERT payload has no joins — refetch the full record
          const { data } = await supabase
            .from('pinned_messages')
            .select(PINNED_SELECT)
            .eq('id', row.id)
            .single()
          if (!data) return
          const pin = data as unknown as PinnedMessage
          setPinnedMessages(prev => {
            if (prev.some(p => p.id === pin.id)) return prev
            return [pin, ...prev]
          })
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
  }, [channelId])

  return { pinnedMessages, pinnedCount: pinnedMessages.length }
}
