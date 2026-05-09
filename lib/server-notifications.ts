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

type MentionNotificationInput = {
  senderId: string
  senderName: string
  messageId: string
  channelId: string
  content: string
}

function attachmentFallback(attachments?: Attachment[] | null): string {
  if (!attachments || attachments.length === 0) return 'New message'
  if (attachments.length > 1) return `${attachments.length} attachments`

  const [attachment] = attachments
  if (attachment.type === 'gif') return 'GIF'
  if (attachment.type === 'image') return 'Image'
  return 'Attachment'
}

export function extractMentionUsernames(content: string): string[] {
  const mentionPattern = /(^|[^\w])@([a-zA-Z0-9_]{1,32})\b/g
  const usernames = new Set<string>()
  let match = mentionPattern.exec(content)

  while (match) {
    usernames.add(match[2].toLowerCase())
    match = mentionPattern.exec(content)
  }

  return Array.from(usernames)
}

export function notificationBody(content: string, attachments?: Attachment[] | null): string {
  const trimmed = content.trim()
  if (trimmed) return trimmed.slice(0, 140)
  return attachmentFallback(attachments)
}

async function mentionPreferenceMap(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, boolean>> {
  const { data } = await supabase
    .from('notification_preferences')
    .select('user_id, mentions')
    .in('user_id', userIds)

  const rows = (data ?? []) as Array<{ user_id: string; mentions: boolean }>
  return new Map(rows.map(row => [row.user_id, row.mentions]))
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
        url: `/dm/${input.conversationId}#${input.messageId}`,
      }
    )
}

export async function enqueueMentionNotifications(
  supabase: SupabaseClient,
  input: MentionNotificationInput
): Promise<void> {
  const usernames = extractMentionUsernames(input.content)
  if (usernames.length === 0) return

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('username', usernames)

  const mentionedProfiles = ((profiles ?? []) as Array<{
    id: string
    username: string
    display_name: string | null
  }>).filter(profile => profile.id !== input.senderId)

  if (mentionedProfiles.length === 0) return

  const preferences = await mentionPreferenceMap(
    supabase,
    mentionedProfiles.map(profile => profile.id)
  )

  const rows = mentionedProfiles
    .filter(profile => preferences.get(profile.id) ?? true)
    .map(profile => ({
      user_id: profile.id,
      actor_id: input.senderId,
      type: 'mention',
      source_table: 'messages',
      source_id: input.messageId,
      conversation_id: null,
      channel_id: input.channelId,
      title: `${input.senderName} mentioned you`,
      body: notificationBody(input.content),
      url: `/channels/${input.channelId}#${input.messageId}`,
    }))

  if (rows.length === 0) return

  await supabase
    .from('notification_events')
    .insert(rows)
}
