'use server'

import { createClient } from '@/lib/supabase/server'
import type { DirectMessageWithProfile, Attachment } from '@/lib/types'

const DM_SELECT = '*, sender:profiles!sender_id(id, username, avatar_url, display_name, username_color, banner_color, badge, pronouns, bio, location, website, member_since, updated_at, created_at)'

export async function sendDM(
  conversationId: string,
  recipientId: string,
  content: string,
  attachments?: Attachment[]
): Promise<{ error: string } | { ok: true; message: DirectMessageWithProfile }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const trimmed = content.trim()
  if (!trimmed && (!attachments || attachments.length === 0)) return { error: 'Message cannot be empty.' }
  if (trimmed.length > 4000) return { error: 'Message too long (max 4000 characters).' }

  const { data: msg, error } = await supabase
    .from('direct_messages')
    .insert({
      conversation_id: conversationId,
      sender_id:       user.id,
      recipient_id:    recipientId,
      content:         trimmed,
      attachments:     attachments ?? [],
    })
    .select(DM_SELECT)
    .single()

  if (error || !msg) return { error: error?.message ?? 'Failed to send message.' }

  // Update conversation preview
  await supabase
    .from('dm_conversations')
    .update({ last_message: trimmed.slice(0, 100), last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  return { ok: true, message: msg as unknown as DirectMessageWithProfile }
}

export async function editDM(
  messageId: string,
  content: string
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const trimmed = content.trim()
  if (!trimmed) return { error: 'Message cannot be empty.' }

  const { error } = await supabase
    .from('direct_messages')
    .update({ content: trimmed, edited_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('sender_id', user.id)

  if (error) return { error: error.message }
  return { ok: true }
}

export async function deleteDM(
  messageId: string
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('direct_messages')
    .delete()
    .eq('id', messageId)
    .eq('sender_id', user.id)

  if (error) return { error: error.message }
  return { ok: true }
}

export async function markDMsRead(
  conversationId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('direct_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('recipient_id', user.id)
    .is('read_at', null)
}
