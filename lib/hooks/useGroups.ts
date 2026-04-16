'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Group } from '@/lib/types'

/**
 * Fetches the current user's groups and subscribes to membership changes
 * so the list stays live when joining or leaving groups.
 */
export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  const fetchGroups = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('group_members')
      .select('joined_at, groups(*)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: true })

    if (data) {
      setGroups(
        data
          .map((row) => row.groups as unknown as Group)
          .filter(Boolean)
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGroups()

    const supabase = createClient()
    const channel = supabase
      .channel('group-membership')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members' },
        fetchGroups
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchGroups])

  return { groups, loading, refetch: fetchGroups }
}
