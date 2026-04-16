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
  await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'admin',
  })

  // Seed #welcome (position 0) and #general (position 1)
  await supabase.from('channels').insert([
    { group_id: group.id, name: 'welcome', position: 0 },
    { group_id: group.id, name: 'general', position: 1 },
  ])

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

  await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id)

  redirect('/channels')
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
