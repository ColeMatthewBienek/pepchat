'use server'

import { withAuth } from '@/lib/actions/withAuth'
import { redirect } from 'next/navigation'

/** Creates a text channel inside a group. Owner/admin only (enforced by RLS). */
export const createChannel = withAuth(
  async function createChannelBody(
    { supabase, user },
    formData: FormData,
  ): Promise<{ error: string } | never> {
    const name = (formData.get('name') as string).trim().toLowerCase().replace(/\s+/g, '-')
    const description = ((formData.get('description') as string | null) ?? '').trim()
    const groupId = formData.get('group_id') as string
    const noobAccess = formData.get('noob_access') === 'on'

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
      .insert({
        group_id: groupId,
        name,
        description: description || null,
        noob_access: noobAccess,
        position: nextPosition,
      })
      .select()
      .single()

    if (error || !channel) return { error: error?.message ?? 'Failed to create channel.' }
    redirect(`/channels/${channel.id}`)
  },
  { unauthenticated: () => redirect('/login') },
)

/** Updates channel name, topic, and access settings. */
export const updateChannelSettings = withAuth(
  async function updateChannelSettingsBody(
    { supabase },
    channelId: string,
    formData: FormData,
  ): Promise<{ error: string } | { ok: true }> {
    const name = (formData.get('name') as string).trim().toLowerCase().replace(/\s+/g, '-')
    const description = ((formData.get('description') as string | null) ?? '').trim()
    const noobAccess = formData.get('noob_access') === 'on'

    if (!channelId) return { error: 'Missing channel.' }
    if (!name) return { error: 'Channel name is required.' }
    if (name.length > 80) return { error: 'Channel name must be 80 characters or fewer.' }
    if (description.length > 180) return { error: 'Topic must be 180 characters or fewer.' }

    const { error } = await supabase
      .from('channels')
      .update({
        name,
        description: description || null,
        noob_access: noobAccess,
      })
      .eq('id', channelId)

    if (error) return { error: error.message }
    return { ok: true }
  },
  { unauthenticated: () => ({ error: 'Not authenticated.' }) },
)

/** Deletes a channel. Owner/admin only (enforced by RLS). */
export const deleteChannel = withAuth(
  async function deleteChannelBody(
    { supabase },
    channelId: string,
    groupId: string,
  ): Promise<{ error: string } | never> {
    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', channelId)

    if (error) return { error: error.message }
    redirect(`/groups/${groupId}`)
  },
  { unauthenticated: () => redirect('/login') },
)

/** Swaps a channel's position with the one above or below it. */
export const moveChannel = withAuth(
  async function moveChannelBody(
    { supabase },
    channelId: string,
    direction: 'up' | 'down',
  ): Promise<{ error: string } | void> {
    // Get the channel we're moving
    const { data: ch, error: channelError } = await supabase
      .from('channels')
      .select('id, group_id, position')
      .eq('id', channelId)
      .single()

    if (channelError) return { error: channelError.message }
    if (!ch) return { error: 'Channel not found.' }

    // Find the adjacent channel
    const { data: adjacent, error: adjacentError } = await supabase
      .from('channels')
      .select('id, position')
      .eq('group_id', ch.group_id)
      .eq('position', direction === 'up' ? ch.position - 1 : ch.position + 1)
      .single()

    if (adjacentError) return { error: adjacentError.message }
    if (!adjacent) return // already at boundary

    // Swap positions
    const { error: channelUpdateError } = await supabase
      .from('channels')
      .update({ position: adjacent.position })
      .eq('id', ch.id)

    if (channelUpdateError) return { error: channelUpdateError.message }

    const { error: adjacentUpdateError } = await supabase
      .from('channels')
      .update({ position: ch.position })
      .eq('id', adjacent.id)

    if (adjacentUpdateError) return { error: adjacentUpdateError.message }
  },
  { unauthenticated: () => ({ error: 'Not authenticated.' }) },
)
