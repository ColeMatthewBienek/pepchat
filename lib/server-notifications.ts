import { createClient } from '@/lib/supabase/server'
import type { Attachment, NotificationPreferences } from '@/lib/types'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

type DirectMessageNotificationInput = {
  recipientId: string
  senderId: string
  senderName: string
  messageId: string
  conversationId: string
  content: string
  attachments?: Attachment[] | null
}

function attachmentFallback(attachments?: Attachment[] | null): string {
  if (!attachments || attachments.length === 0) return 'New message'
  if (attachments.length > 1) return `${attachments.length} attachments`

  const [attachment] = attachments
  if (attachment.type === 'gif') return 'GIF'
  if (attachment.type === 'image') return 'Image'
  return 'Attachment'
}

export function notificationBody(content: string, attachments?: Attachment[] | null): string {
  const trimmed = content.trim()
  if (trimmed) return trimmed.slice(0, 140)
  return attachmentFallback(attachments)
}

async function allowsDMNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('dm_messages')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return true
  const preferences = data as Pick<NotificationPreferences, 'dm_messages'> | null
  return preferences?.dm_messages ?? true
}

export async function enqueueDirectMessageNotification(
  supabase: SupabaseClient,
  input: DirectMessageNotificationInput
): Promise<void> {
  if (input.recipientId === input.senderId) return
  if (!await allowsDMNotifications(supabase, input.recipientId)) return

  await supabase
    .from('notification_events')
    .insert(
      {
        user_id: input.recipientId,
        actor_id: input.senderId,
        type: 'dm_message',
        source_table: 'direct_messages',
        source_id: input.messageId,
        conversation_id: input.conversationId,
        channel_id: null,
        title: input.senderName,
        body: notificationBody(input.content, input.attachments),
        url: `/channels?dm=${input.conversationId}`,
      }
    )
}
