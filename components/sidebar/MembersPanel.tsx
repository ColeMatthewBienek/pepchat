'use client'

import { useEffect, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { assignRole, kickMember } from '@/app/(app)/members/actions'
import Avatar from '@/components/ui/Avatar'
import RolePill from '@/components/ui/RolePill'
import { PERMISSIONS, type Role } from '@/lib/permissions'
import type { GroupMember, Profile } from '@/lib/types'

const ProfileCard = dynamic(() => import('@/components/profile/ProfileCard'), { ssr: false })

type MemberWithProfile = GroupMember & { profiles: Pick<Profile, 'username' | 'avatar_url'> }

const ASSIGNABLE_ROLES: Role[] = ['moderator', 'user', 'noob']

interface MembersPanelProps {
  groupId: string
  currentUserId: string
  currentUserRole: Role
}

/**
 * Collapsible members list shown in the channels sidebar.
 * Admins can assign roles and kick. Moderators see read-only view.
 */
export default function MembersPanel({ groupId, currentUserId, currentUserRole }: MembersPanelProps) {
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [expanded, setExpanded] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [profileCard, setProfileCard] = useState<{ userId: string; anchor: HTMLElement } | null>(null)

  const canManage = PERMISSIONS.canAssignRoles(currentUserRole)
  const canKick   = PERMISSIONS.canKickMembers(currentUserRole)
  const router = useRouter()

  async function handleMessage(userId: string) {
    const supabase = createClient()
    const { data: convId } = await supabase.rpc('get_or_create_dm', { other_user_id: userId })
    if (convId) router.push(`/dm/${convId}`)
  }

  useEffect(() => {
    if (!groupId) return
    const supabase = createClient()

    async function fetchMembers() {
      const { data } = await supabase
        .from('group_members')
        .select('*, profiles(username, avatar_url)')
        .eq('group_id', groupId)
        .order('role')

      if (data) setMembers(data as MemberWithProfile[])
    }

    fetchMembers()

    // Live updates when roles change or members join/leave
    const sub = supabase
      .channel(`members-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` }, fetchMembers)
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [groupId])

  function handleRoleChange(member: MemberWithProfile, newRole: Role) {
    setError('')
    startTransition(async () => {
      const result = await assignRole(groupId, member.user_id, newRole)
      if (result && 'error' in result) setError(result.error)
    })
  }

  function handleKick(member: MemberWithProfile) {
    if (!confirm(`Kick ${member.profiles.username} from the group?`)) return
    setError('')
    startTransition(async () => {
      const result = await kickMember(groupId, member.user_id)
      if (result && 'error' in result) setError(result.error)
    })
  }

  return (
    <div className="border-t border-black/20 mt-2">
      {/* Section header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        aria-expanded={expanded}
      >
        <span>Members — {members.length}</span>
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`}
          fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {error && (
        <p className="mx-3 mb-2 text-xs text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded px-2 py-1">
          {error}
        </p>
      )}

      {expanded && (
        <ul className="pb-2 space-y-0.5">
          {members.map((member) => {
            const isSelf = member.user_id === currentUserId
            const isTargetAdmin = member.role === 'admin'
            const memberName = (member.profiles as any)?.display_name ?? member.profiles?.username ?? member.user_id

            return (
              <li key={member.user_id} className="group/member flex items-center gap-2 px-3 py-1 hover:bg-white/5 rounded mx-1">
                <button
                  className="rounded-full flex-shrink-0 focus:outline-none"
                  onClick={e => setProfileCard({ userId: member.user_id, anchor: e.currentTarget })}
                  aria-label={`Open ${memberName}'s profile`}
                >
                  <Avatar
                    user={{
                      avatar_url: member.profiles?.avatar_url,
                      username: member.profiles?.username ?? '?',
                      display_name: (member.profiles as any)?.display_name,
                    }}
                    size={28}
                  />
                </button>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={e => setProfileCard({ userId: member.user_id, anchor: e.currentTarget })}>
                  <p className="text-sm truncate">{memberName}</p>
                  {(member.profiles as any)?.display_name && (
                    <p className="text-xs text-[var(--text-muted)] truncate">@{member.profiles?.username}</p>
                  )}
                </div>

                {/* Role badge / dropdown */}
                {canManage && !isSelf && !isTargetAdmin ? (
                  <select
                    value={member.role}
                    disabled={isPending}
                    onChange={(e) => handleRoleChange(member, e.target.value as Role)}
                    className="text-xs rounded px-1 py-0.5 border bg-[var(--bg-primary)] text-[var(--text-primary)] border-white/10 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <RolePill role={member.role as Role} />
                )}

                {/* Message button */}
                {!isSelf && (
                  <button
                    onClick={() => handleMessage(member.user_id)}
                    title="Send message"
                    aria-label={`Send message to ${memberName}`}
                    className="hidden group-hover/member:flex items-center justify-center w-5 h-5 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors flex-shrink-0"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </button>
                )}

                {/* Kick button */}
                {canKick && !isSelf && !isTargetAdmin && (
                  <button
                    onClick={() => handleKick(member)}
                    disabled={isPending}
                    title="Kick member"
                    aria-label={`Kick ${memberName} from group`}
                    className="hidden group-hover/member:flex items-center justify-center w-5 h-5 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors flex-shrink-0"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {profileCard && (
        <ProfileCard
          userId={profileCard.userId}
          currentUserId={currentUserId}
          anchorEl={profileCard.anchor}
          onClose={() => setProfileCard(null)}
        />
      )}
    </div>
  )
}
