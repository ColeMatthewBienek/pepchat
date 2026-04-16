'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Channel } from '@/lib/types'

/**
 * Fetches channels for the given group and subscribes to live changes.
 */
export function useChannels(groupId: string | null) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

  const fetchChannels = useCallback(async () => {
    if (!groupId) {
      setChannels([])
      setLoading(false)
      return
    }
    const supabase = createClient()
    const { data } = await supabase
      .from('channels')
      .select('*')
      .eq('group_id', groupId)
      .order('position', { ascending: true })

    if (data) setChannels(data as Channel[])
    setLoading(false)
  }, [groupId])

  useEffect(() => {
    setLoading(true)
    fetchChannels()

    if (!groupId) return

    const supabase = createClient()
    const sub = supabase
      .channel(`channels-${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channels', filter: `group_id=eq.${groupId}` },
        fetchChannels
      )
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [groupId, fetchChannels])

  return { channels, loading, refetch: fetchChannels }
}
