'use server'

import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/permissions'

/**
 * Assigns a new role to a group member.
 * Only admins can call this. Cannot change another admin's role.
 * Cannot demote yourself.
 */
export async function assignRole(
  groupId: string,
  targetUserId: string,
  newRole: Role
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Enforce: caller must be admin
  const { data: callerMembership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (callerMembership?.role !== 'admin') {
    return { error: 'Only admins can assign roles.' }
  }

  // Enforce: cannot change own role
  if (targetUserId === user.id) {
    return { error: 'You cannot change your own role.' }
  }

  // Enforce: cannot assign admin role (there can only be one admin — the owner)
  if (newRole === 'admin') {
    return { error: 'Cannot assign the admin role.' }
  }

  // Enforce: cannot touch another admin's row
  const { data: targetMembership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', targetUserId)
    .single()

  if (targetMembership?.role === 'admin') {
    return { error: 'Cannot change an admin\'s role.' }
  }

  const { error } = await supabase
    .from('group_members')
    .update({ role: newRole })
    .eq('group_id', groupId)
    .eq('user_id', targetUserId)

  if (error) return { error: error.message }

  return { ok: true }
}

/**
 * Removes a member from a group (kick).
 * Admins can kick anyone except other admins.
 * Moderators can kick user/noob only.
 */
export async function kickMember(
  groupId: string,
  targetUserId: string
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: callerMembership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  const callerRole = callerMembership?.role
  if (!callerRole || !['admin', 'moderator'].includes(callerRole)) {
    return { error: 'You do not have permission to kick members.' }
  }

  if (targetUserId === user.id) {
    return { error: 'Use "Leave Group" to remove yourself.' }
  }

  const { data: targetMembership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', targetUserId)
    .single()

  const targetRole = targetMembership?.role

  // Moderators cannot kick admins or other moderators
  if (callerRole === 'moderator' && targetRole && ['admin', 'moderator'].includes(targetRole)) {
    return { error: 'Moderators can only kick users and noobs.' }
  }

  // Nobody can kick the admin
  if (targetRole === 'admin') {
    return { error: 'The group admin cannot be kicked.' }
  }

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', targetUserId)

  if (error) return { error: error.message }

  return { ok: true }
}
