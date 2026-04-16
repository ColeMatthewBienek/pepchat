'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Toggle an emoji reaction on a message.
 * If the current user already has this reaction, it is removed.
 * Otherwise it is added.
 * Returns the action taken so the client can sync optimistic state.
 */
export async function toggleReaction(
  messageId: string,
  emoji: string
): Promise<{ error: string } | { ok: true; action: 'added' | 'removed' }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Check if the reaction already exists
  const { data: existing } = await supabase
    .from('message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('id', existing.id)
    if (error) return { error: error.message }
    return { ok: true, action: 'removed' }
  } else {
    const { error } = await supabase
      .from('message_reactions')
      .insert({ message_id: messageId, user_id: user.id, emoji })
    if (error) return { error: error.message }
    return { ok: true, action: 'added' }
  }
}
