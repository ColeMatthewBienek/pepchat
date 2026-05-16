'use server'

import { withAuth } from '@/lib/actions/withAuth'
import { logAuditEvent } from '@/lib/audit'
import { gateGroupRole } from '@/lib/permissions/gate'
import { PERMISSIONS } from '@/lib/permissions'
import type { Role } from '@/lib/permissions'

/**
 * Assigns a new role to a group member.
 * Only admins can call this. Cannot change another admin's role.
 * Cannot demote yourself.
 */
export const assignRole = withAuth(
  async (
    { supabase, user },
    groupId: string,
    targetUserId: string,
    newRole: Role
  ): Promise<{ error: string } | { ok: true }> => {
    // Enforce: caller must be admin
    const callerGate = await gateGroupRole(supabase, {
      groupId,
      userId: user.id,
      predicate: PERMISSIONS.canAssignRoles,
      deniedMessage: 'Only admins can assign roles.',
    })
    if ('error' in callerGate) return callerGate

    // Enforce: cannot change own role
    if (targetUserId === user.id) {
      return { error: 'You cannot change your own role.' }
    }

    // Enforce: cannot assign admin role (there can only be one admin — the owner)
    if (newRole === 'admin') {
      return { error: 'Cannot assign the admin role.' }
    }

    // Enforce: cannot touch another admin's row
    const { data: targetMembership, error: targetError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', targetUserId)
      .single()

    if (targetError) return { error: targetError.message }
    if (!targetMembership?.role) {
      return { error: 'Target member was not found.' }
    }
    if (targetMembership?.role === 'admin') {
      return { error: 'Cannot change an admin\'s role.' }
    }

    const { error } = await supabase
      .from('group_members')
      .update({ role: newRole })
      .eq('group_id', groupId)
      .eq('user_id', targetUserId)

    if (error) return { error: error.message }
    await logAuditEvent(supabase, user.id, 'member_role_changed', 'user', targetUserId, {
      group_id: groupId,
      from_role: targetMembership.role,
      to_role: newRole,
    })

    return { ok: true }
  },
  { unauthenticated: () => ({ error: 'Not authenticated.' }) }
)

/**
 * Removes a member from a group (kick).
 * Admins can kick anyone except other admins.
 * Moderators can kick user/noob only.
 */
export const kickMember = withAuth(
  async (
    { supabase, user },
    groupId: string,
    targetUserId: string
  ): Promise<{ error: string } | { ok: true }> => {
    const callerGate = await gateGroupRole(supabase, {
      groupId,
      userId: user.id,
      predicate: PERMISSIONS.canKickMembers,
      deniedMessage: 'You do not have permission to kick members.',
    })
    if ('error' in callerGate) return callerGate

    const callerRole = callerGate.membership.role

    if (targetUserId === user.id) {
      return { error: 'Use "Leave Group" to remove yourself.' }
    }

    const { data: targetMembership, error: targetError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', targetUserId)
      .single()

    if (targetError) return { error: targetError.message }
    const targetRole = targetMembership?.role
    if (!targetRole) {
      return { error: 'Target member was not found.' }
    }

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
    await logAuditEvent(supabase, user.id, 'member_kicked', 'user', targetUserId, {
      group_id: groupId,
      actor_role: callerRole,
      target_role: targetRole,
    })

    return { ok: true }
  },
  { unauthenticated: () => ({ error: 'Not authenticated.' }) }
)
