'use server'

import { createClient } from '@/lib/supabase/server'
import type { Profile, ProfileUpdate } from '@/lib/types'

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data as Profile | null
}

export async function updateProfile(
  update: ProfileUpdate,
  avatarBlob?: { data: string; ext: string } | null
): Promise<{ error: string } | { ok: true; profile: Profile }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  let avatar_url = update.avatar_url

  // Upload avatar if provided (base64 data URL)
  if (avatarBlob) {
    const bytes = Buffer.from(avatarBlob.data.split(',')[1], 'base64')
    const path = `${user.id}/avatar.${avatarBlob.ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, bytes, {
        contentType: `image/${avatarBlob.ext === 'jpg' ? 'jpeg' : avatarBlob.ext}`,
        upsert: true,
      })
    if (uploadError) return { error: 'Avatar upload failed. Profile text saved.' }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    avatar_url = `${urlData.publicUrl}?t=${Date.now()}`
  }

  const payload: ProfileUpdate = { ...update }
  if (avatar_url !== undefined) payload.avatar_url = avatar_url

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id)
    .select('*')
    .single()

  if (error || !data) return { error: error?.message ?? "Couldn't save profile. Try again." }
  return { ok: true, profile: data as Profile }
}

export async function removeAvatar(): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Remove all files in user's avatar folder
  const { data: files } = await supabase.storage.from('avatars').list(user.id)
  if (files?.length) {
    await supabase.storage.from('avatars').remove(files.map(f => `${user.id}/${f.name}`))
  }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { ok: true }
}
