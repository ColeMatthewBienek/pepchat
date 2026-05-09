'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
    { group_id: group.id, name: 'welcome', position: 0 },
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

  const inviteCode = (formData.get('invite_code') as string).trim()
  if (!inviteCode) return { error: 'Invite code is required.' }

  const { data: group } = await supabase
    .from('groups')
    .select('id')
    .eq('invite_code', inviteCode)
    .single()

  if (!group) return { error: 'Invalid invite code.' }

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
