'use server'

import type { Profile, ProfileUpdate } from '@/lib/types'
import { withAuth } from '@/lib/actions/withAuth'

export async function getProfile(userId: string): Promise<Profile | null> {
  // This is a read-only public lookup — no auth required.
  // Caller may be looking up another user's profile.
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data as Profile | null
}

export const updateProfile = withAuth(
  async ({ supabase, user }, update: ProfileUpdate, avatarBlob?: { data: string; ext: string } | null): Promise<{ error: string } | { ok: true; profile: Profile }> => {
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
  },
  { unauthenticated: () => ({ error: 'Not authenticated.' }) },
)

export const removeAvatar = withAuth(
  async ({ supabase, user }): Promise<{ error: string } | { ok: true }> => {
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
  },
  { unauthenticated: () => ({ error: 'Not authenticated.' }) },
)
