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

  revalidatePath('/(app)', 'layout')
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
  messageId: string
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const pinnedAt = new Date().toISOString()
  const { error } = await supabase
    .from('messages')
    .update({ pinned_at: pinnedAt })
    .eq('id', messageId)

  if (error) return { error: error.message }

  revalidatePath('/(app)', 'layout')
  return { ok: true }
}
