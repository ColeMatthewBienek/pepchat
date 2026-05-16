'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GroupMember, Profile } from '@/lib/types'

/**
 * Shallow-equality check for array of objects by `user_id`.
 * Avoids unnecessary re-renders when the realtime callback fires
 * with identical data.
 */
function membersEqual(a: MemberWithProfile[], b: MemberWithProfile[]): boolean {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (a[i].user_id !== b[i].user_id || a[i].role !== b[i].role) return false
	}
	return true
}

/**
 * Fetches members of a group with realtime subscription.
 * Members are joined with their profile data (username, avatar_url).
 * Ordered by role (admin → moderator → user → noob).
 *
 * Extracted from components/sidebar/MembersPanel.tsx (Finding 4).
 */
export function useMembersList(groupId: string): {
	members: MemberWithProfile[]
	loading: boolean
} {
	const [members, setMembers] = useState<MemberWithProfile[]>([])
	const [loading, setLoading] = useState(true)

	// Persist supabase client to avoid recreating the channel
	const supabaseRef = useRef(createClient())

	useEffect(() => {
		if (!groupId) return

		async function fetchMembers() {
			const { data } = await supabaseRef.current
				.from('group_members')
				.select('*, profiles(username, avatar_url)')
				.eq('group_id', groupId)
				.order('role')

			setMembers((prev) => {
				const next = data as MemberWithProfile[]
				return membersEqual(prev, next) ? prev : next
			})
			setLoading(false)
		}

		fetchMembers()

		const sub = supabaseRef.current
			.channel(`members-${groupId}`)
			.on('postgres_changes', {
				event: '*',
				schema: 'public',
				table: 'group_members',
				filter: `group_id=eq.${groupId}`,
			}, fetchMembers)
			.subscribe()

		return () => {
			supabaseRef.current.removeChannel(sub)
		}
	}, [groupId])

	return { members, loading }
}

export type MemberWithProfile = GroupMember & {
	profiles: Pick<Profile, 'username' | 'avatar_url'>
}
