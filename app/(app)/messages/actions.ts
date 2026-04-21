'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { MessageWithProfile, Attachment } from '@/lib/types'
import { MESSAGE_SELECT } from '@/lib/queries'

export async function sendMessage(
  channelId: string,
  content: string,
  replyToId?: string | null,
  attachments?: Attachment[]
): Promise<{ error: string } | { ok: true; message: MessageWithProfile }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const trimmed = content.trim()
  if (!trimmed && (!attachments || attachments.length === 0)) return { error: 'Message cannot be empty.' }
  if (trimmed.length > 4000) return { error: 'Message too long (max 4000 characters).' }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      channel_id:  channelId,
      user_id:     user.id,
      content:     trimmed,
      reply_to_id: replyToId ?? null,
      attachments: attachments ?? [],
    })
    .select(MESSAGE_SELECT)
    .single()

  if (error || !message) return { error: error?.message ?? 'Failed to send message.' }
  return { ok: true, message: message as MessageWithProfile }
}

export async function editMessage(
  messageId: string,
  content: string
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const trimmed = content.trim()
  if (!trimmed) return { error: 'Message cannot be empty.' }
  if (trimmed.length > 4000) return { error: 'Message too long (max 4000 characters).' }

  const { error } = await supabase
    .from('messages')
    .update({ content: trimmed, edited_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  return { ok: true }
}

export async function deleteMessage(
  messageId: string
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)

  if (error) return { error: error.message }
  return { ok: true }
}

export async function pinMessage(
  messageId: string,
  channelId: string
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', user.id)
    .single()

  // Idempotent: skip if already pinned
  const { data: existing } = await supabase
    .from('pinned_messages')
    .select('id')
    .eq('channel_id', channelId)
    .eq('message_id', messageId)
    .maybeSingle()
  if (existing) return { ok: true }

  // Mark the message itself as pinned (RPC bypasses ownership RLS)
  await supabase.rpc('set_message_pinned_at', {
    p_message_id: messageId,
    p_pinned_at:  new Date().toISOString(),
  })

  // Insert the system message
  const pinnedBy = profile?.display_name ?? profile?.username ?? 'Someone'
  const { data: systemMsg } = await supabase
    .from('messages')
    .insert({
      channel_id: channelId,
      user_id:    user.id,
      content:    '',
      is_system:  true,
      system_type: 'pin',
      system_data: { pinned_by: pinnedBy, message_id: messageId },
    })
    .select('id')
    .single()

  // Record in pinned_messages
  const { error } = await supabase
    .from('pinned_messages')
    .insert({
      channel_id:        channelId,
      message_id:        messageId,
      pinned_by_id:      user.id,
      system_message_id: systemMsg?.id ?? null,
    })

  if (error) return { error: error.message }
  return { ok: true }
}

export async function unpinMessage(
  pinnedId: string
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Fetch system_message_id and message_id before deleting
  const { data: pin } = await supabase
    .from('pinned_messages')
    .select('message_id, system_message_id')
    .eq('id', pinnedId)
    .single()

  const { error } = await supabase
    .from('pinned_messages')
    .delete()
    .eq('id', pinnedId)

  if (error) return { error: error.message }

  if (pin) {
    // Clear pinned_at on the original message (RPC bypasses ownership RLS)
    await supabase.rpc('set_message_pinned_at', {
      p_message_id: pin.message_id,
      p_pinned_at:  null,
    })

    // Delete the system message
    if (pin.system_message_id) {
      await supabase.from('messages').delete().eq('id', pin.system_message_id)
    }
  }

  return { ok: true }
}
