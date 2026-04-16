'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/** Creates a text channel inside a group. Owner/admin only (enforced by RLS). */
export async function createChannel(
  formData: FormData
): Promise<{ error: string } | never> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = (formData.get('name') as string).trim().toLowerCase().replace(/\s+/g, '-')
  const groupId = formData.get('group_id') as string

  if (!name) return { error: 'Channel name is required.' }
  if (!groupId) return { error: 'Missing group.' }

  // Get the current max position
  const { data: existing } = await supabase
    .from('channels')
    .select('position')
    .eq('group_id', groupId)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0

  const { data: channel, error } = await supabase
    .from('channels')
    .insert({ group_id: groupId, name, position: nextPosition })
    .select()
    .single()

  if (error || !channel) return { error: error?.message ?? 'Failed to create channel.' }
  redirect(`/channels/${channel.id}`)
}

/** Deletes a channel. Owner/admin only (enforced by RLS). */
export async function deleteChannel(
  channelId: string,
  groupId: string
): Promise<{ error: string } | never> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('channels')
    .delete()
    .eq('id', channelId)

  if (error) return { error: error.message }
  redirect(`/groups/${groupId}`)
}

/** Swaps a channel's position with the one above or below it. */
export async function moveChannel(
  channelId: string,
  direction: 'up' | 'down'
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Get the channel we're moving
  const { data: ch } = await supabase
    .from('channels')
    .select('id, group_id, position')
    .eq('id', channelId)
    .single()

  if (!ch) return { error: 'Channel not found.' }

  // Find the adjacent channel
  const { data: adjacent } = await supabase
    .from('channels')
    .select('id, position')
    .eq('group_id', ch.group_id)
    .eq('position', direction === 'up' ? ch.position - 1 : ch.position + 1)
    .single()

  if (!adjacent) return // already at boundary

  // Swap positions
  await supabase.from('channels').update({ position: adjacent.position }).eq('id', ch.id)
  await supabase.from('channels').update({ position: ch.position }).eq('id', adjacent.id)
}
