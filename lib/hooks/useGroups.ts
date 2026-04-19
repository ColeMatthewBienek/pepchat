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

    // Re-fetch when membership changes (join/leave)
    const membershipSub = supabase
      .channel('group-membership')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members' },
        fetchGroups
      )
      .subscribe()

    // Update icon_url (and other group fields) in real time
    const groupsSub = supabase
      .channel('group-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'groups' },
        (payload) => {
          setGroups(prev =>
            prev.map(g => g.id === payload.new.id ? { ...g, ...(payload.new as Group) } : g)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(membershipSub)
      supabase.removeChannel(groupsSub)
    }
  }, [fetchGroups])

  return { groups, loading, refetch: fetchGroups }
}
