'use server'

import { createClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit'
import { redirect } from 'next/navigation'

function generateInviteCode(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

type InviteRecord = {
  id: string
  group_id: string
  code: string
  created_by: string | null
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  revoked_at: string | null
  created_at: string
  profiles?: { username: string | null } | null
}

function parseInviteOptions(formData?: FormData) {
  const maxUsesRaw = formData?.get('max_uses')?.toString().trim() ?? ''
  const expiresRaw = formData?.get('expires_at')?.toString().trim() ?? ''
  const max_uses = maxUsesRaw ? Number(maxUsesRaw) : null
  const expires_at = expiresRaw ? new Date(expiresRaw).toISOString() : null

  if (max_uses !== null && (!Number.isInteger(max_uses) || max_uses < 1 || max_uses > 1000)) {
    return { error: 'Usage limit must be between 1 and 1000.' } as const
  }

  if (expiresRaw) {
    const expiresAt = new Date(expiresRaw)
    if (Number.isNaN(expiresAt.getTime())) return { error: 'Expiration date is invalid.' } as const
    if (expiresAt.getTime() <= Date.now()) return { error: 'Expiration date must be in the future.' } as const
  }

  return { max_uses, expires_at } as const
}

function inviteIsUsable(invite: Pick<InviteRecord, 'revoked_at' | 'expires_at' | 'max_uses' | 'uses_count'>) {
  if (invite.revoked_at) return false
  if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) return false
  if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) return false
  return true
}

function normalizeInviteCode(value: string) {
  const trimmed = value.trim()
  const match = trimmed.match(/\/join\/([^/?#]+)/)
  return decodeURIComponent(match?.[1] ?? trimmed).trim()
}

async function getAdminMembership(supabase: Awaited<ReturnType<typeof createClient>>, groupId: string, userId: string) {
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single()

  return membership?.role === 'admin'
}

/**
 * Creates a new group. Creator gets the 'admin' role.
 * Seeds both a #general and a #welcome channel.
 */
export async function createGroup(
  formData: FormData
): Promise<{ error: string } | { redirectTo: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { redirectTo: '/login' }

  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'Group name is required.' }
  if (name.length > 100) return { error: 'Name must be 100 characters or fewer.' }

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({ name, owner_id: user.id })
    .select()
    .single()

  if (groupError || !group) return { error: groupError?.message ?? 'Failed to create group.' }

  // Creator is the admin
  const { error: memberError } = await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'admin',
  })
  if (memberError) return { error: memberError.message }

  // Seed #welcome (position 0) and #general (position 1)
  const { error: channelError } = await supabase.from('channels').insert([
    { group_id: group.id, name: 'welcome', description: 'Start here for intros and first steps.', noob_access: true, position: 0 },
    { group_id: group.id, name: 'general', position: 1 },
  ])
  if (channelError) return { error: channelError.message }

  const { data: generalChannel } = await supabase
    .from('channels')
    .select('id')
    .eq('group_id', group.id)
    .eq('name', 'general')
    .single()

  return { redirectTo: generalChannel ? `/channels/${generalChannel.id}` : `/groups/${group.id}` }
}

/**
 * Joins an existing group via invite code.
 * New members start with the 'noob' role.
 */
export async function joinGroup(
  formData: FormData
): Promise<{ error: string } | { redirectTo: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { redirectTo: '/login' }

  const inviteCode = normalizeInviteCode(formData.get('invite_code') as string)
  if (!inviteCode) return { error: 'Invite code is required.' }

  const { data: invite } = await supabase
    .from('group_invites')
    .select('id, group_id, max_uses, uses_count, expires_at, revoked_at')
    .eq('code', inviteCode)
    .single()

  const { data: legacyGroup } = invite ? { data: null } : await supabase
    .from('groups')
    .select('id')
    .eq('invite_code', inviteCode)
    .single()

  const group = invite ? { id: invite.group_id } : legacyGroup
  if (!group) return { error: 'Invalid invite code.' }
  if (invite && !inviteIsUsable(invite)) return { error: 'Invite link has expired or reached its usage limit.' }

  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    const { error } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      role: 'noob',
    })
    if (error) return { error: error.message }

    if (invite) {
      await supabase.from('group_invite_uses').insert({
        invite_id: invite.id,
        group_id: invite.group_id,
        user_id: user.id,
      })
      await supabase
        .from('group_invites')
        .update({ uses_count: invite.uses_count + 1 })
        .eq('id', invite.id)
    }
  }

  return { redirectTo: `/groups/${group.id}` }
}

/**
 * Updates basic group details. Group admins only.
 */
export async function updateGroupDetails(
  groupId: string,
  formData: FormData,
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const description = (formData.get('description') as string | null)?.trim() ?? ''

  if (!name) return { error: 'Group name is required.' }
  if (name.length > 100) return { error: 'Name must be 100 characters or fewer.' }
  if (description.length > 180) return { error: 'Description must be 180 characters or fewer.' }

  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'admin') {
    return { error: 'Only group admins can update group details.' }
  }

  const { error } = await supabase
    .from('groups')
    .update({ name, description: description || null })
    .eq('id', groupId)
    .eq('owner_id', user.id)

  if (error) return { error: error.message }
  await logAuditEvent(supabase, user.id, 'group_details_updated', 'group', groupId, {
    name,
    description: description || null,
  })
  return { ok: true }
}

/**
 * Rotates a group's invite code. Group admins only.
 */
export async function regenerateGroupInvite(
  groupId: string,
  formData?: FormData,
): Promise<{ error: string } | { ok: true; invite_code: string; invite: InviteRecord }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  if (!(await getAdminMembership(supabase, groupId, user.id))) {
    return { error: 'Only group admins can regenerate invite links.' }
  }

  const options = parseInviteOptions(formData)
  if ('error' in options) return { error: options.error ?? 'Invalid invite options.' }

  const invite_code = generateInviteCode()
  const { data: invite, error: inviteError } = await supabase
    .from('group_invites')
    .insert({
      group_id: groupId,
      code: invite_code,
      created_by: user.id,
      max_uses: options.max_uses,
      expires_at: options.expires_at,
    })
    .select()
    .single()

  if (inviteError || !invite) return { error: inviteError?.message ?? 'Failed to create invite.' }

  const { error } = await supabase
    .from('groups')
    .update({ invite_code })
    .eq('id', groupId)
    .eq('owner_id', user.id)

  if (error) return { error: error.message }
  await logAuditEvent(supabase, user.id, 'invite_regenerated', 'invite', invite.id, {
    group_id: groupId,
    max_uses: options.max_uses,
    expires_at: options.expires_at,
  })
  return { ok: true, invite_code, invite: invite as InviteRecord }
}

export async function listGroupInvites(
  groupId: string,
): Promise<{ error: string } | { ok: true; invites: InviteRecord[]; uses: any[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  if (!(await getAdminMembership(supabase, groupId, user.id))) {
    return { error: 'Only group admins can view invite history.' }
  }

  const { data: invites, error: invitesError } = await supabase
    .from('group_invites')
    .select('*, profiles!group_invites_created_by_fkey(username)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (invitesError) return { error: invitesError.message }

  const { data: uses, error: usesError } = await supabase
    .from('group_invite_uses')
    .select('*, group_invites(code), profiles(username)')
    .eq('group_id', groupId)
    .order('used_at', { ascending: false })
    .limit(25)

  if (usesError) return { error: usesError.message }

  return { ok: true, invites: (invites ?? []) as InviteRecord[], uses: uses ?? [] }
}

export async function revokeGroupInvite(
  inviteId: string,
  groupId: string,
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  if (!(await getAdminMembership(supabase, groupId, user.id))) {
    return { error: 'Only group admins can revoke invites.' }
  }

  const { error } = await supabase
    .from('group_invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('group_id', groupId)

  if (error) return { error: error.message }
  await logAuditEvent(supabase, user.id, 'invite_revoked', 'invite', inviteId, {
    group_id: groupId,
  })
  return { ok: true }
}

/**
 * Leaves a group. Admins must delete the group instead.
 */
export async function leaveGroup(
  groupId: string
): Promise<{ error: string } | never> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role === 'admin') {
    return { error: 'Admins cannot leave. Delete the group instead.' }
  }

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  redirect('/channels')
}

/**
 * Uploads a group icon for a group the caller owns or admins.
 * Overwrites any existing icon at the same path.
 */
export async function uploadGroupIcon(
  groupId: string,
  iconBlob: { dataUrl: string; ext: string }
): Promise<{ error: string } | { ok: true; icon_url: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['admin'].includes(membership.role)) {
    return { error: 'Only group admins can update the group photo.' }
  }

  const bytes = Buffer.from(iconBlob.dataUrl.split(',')[1], 'base64')
  const path = `groups/${groupId}/icon.${iconBlob.ext}`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, {
      contentType: `image/${iconBlob.ext === 'jpg' ? 'jpeg' : iconBlob.ext}`,
      upsert: true,
    })
  if (uploadError) return { error: 'Icon upload failed.' }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
  const icon_url = `${urlData.publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabase
    .from('groups')
    .update({ icon_url })
    .eq('id', groupId)

  if (updateError) return { error: updateError.message }
  await logAuditEvent(supabase, user.id, 'group_icon_updated', 'group', groupId, {
    icon_ext: iconBlob.ext,
  })
  return { ok: true, icon_url }
}

/**
 * Removes the group icon, reverting to the colored bubble fallback.
 */
export async function removeGroupIcon(
  groupId: string
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['admin'].includes(membership.role)) {
    return { error: 'Only group admins can remove the group photo.' }
  }

  const files = await supabase.storage.from('avatars').list(`groups/${groupId}`)
  if (files.error) return { error: files.error.message }

  if (files.data?.length) {
    const { error: removeError } = await supabase.storage
      .from('avatars')
      .remove(files.data.map(f => `groups/${groupId}/${f.name}`))
    if (removeError) return { error: removeError.message }
  }

  const { error } = await supabase
    .from('groups')
    .update({ icon_url: null })
    .eq('id', groupId)

  if (error) return { error: error.message }
  await logAuditEvent(supabase, user.id, 'group_icon_removed', 'group', groupId)
  return { ok: true }
}

/**
 * Deletes a group (admin only). Cascades to channels and messages.
 */
export async function deleteGroup(
  groupId: string
): Promise<{ error: string } | never> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId)
    .eq('owner_id', user.id)

  if (error) return { error: error.message }
  redirect('/channels')
}
