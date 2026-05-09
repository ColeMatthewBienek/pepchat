'use server'

import { createClient } from '@/lib/supabase/server'
import type { NotificationPreferences, NotificationPreferenceUpdate } from '@/lib/types'

type PreferencesResult =
  | { error: string }
  | { ok: true; preferences: NotificationPreferences }

function defaultPreferences(userId: string): NotificationPreferences {
  const now = new Date().toISOString()
  return {
    user_id: userId,
    dm_messages: true,
    mentions: true,
    group_messages: false,
    created_at: now,
    updated_at: now,
  }
}

function preferencePayload(update: NotificationPreferenceUpdate): NotificationPreferenceUpdate {
  const payload: NotificationPreferenceUpdate = {}
  if (typeof update.dm_messages === 'boolean') payload.dm_messages = update.dm_messages
  if (typeof update.mentions === 'boolean') payload.mentions = update.mentions
  if (typeof update.group_messages === 'boolean') payload.group_messages = update.group_messages
  return payload
}

export async function getNotificationPreferences(): Promise<PreferencesResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return { error: error.message }
  }

  return { ok: true, preferences: (data as NotificationPreferences | null) ?? defaultPreferences(user.id) }
}

export async function updateNotificationPreferences(
  update: NotificationPreferenceUpdate
): Promise<PreferencesResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const payload = preferencePayload(update)
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        ...payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single()

  if (error || !data) {
    return { error: error?.message ?? "Couldn't save notification preferences." }
  }

  return { ok: true, preferences: data as NotificationPreferences }
}
