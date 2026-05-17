import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export type PendingAccountInviteClaim = {
  id: string
  invite_id: string
  group_id: string
  auth_user_id: string
  email: string
  status: 'pending_profile' | 'consumed' | 'revoked'
  claimed_at: string
  consumed_at: string | null
}

export async function userHasPendingAccountInviteClaim(
  supabase: SupabaseClient,
  userId?: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('user_has_pending_account_invite_claim', {
    p_auth_user_id: userId ?? null,
  })
  if (error) return false
  return Boolean(data)
}

export async function createOrReplaceAccountInviteClaim(input: {
  inviteCode: string
  authUserId: string
  email: string
}): Promise<{ ok: true; claim: PendingAccountInviteClaim; groupId: string } | { error: string }> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('create_or_replace_account_invite_claim', {
    p_invite_code: input.inviteCode,
    p_auth_user_id: input.authUserId,
    p_email: input.email,
  })

  if (error || !data) return { error: error?.message ?? 'Unable to create invite claim.' }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) return { error: 'Unable to create invite claim.' }

  return {
    ok: true,
    claim: row as PendingAccountInviteClaim,
    groupId: (row as { group_id: string }).group_id,
  }
}

export async function completeAccountInviteProfile(
  supabase: SupabaseClient,
  username: string,
): Promise<{ ok: true; groupId: string } | { error: string }> {
  const { data, error } = await supabase.rpc('complete_account_invite_profile', {
    p_username: username,
  })

  if (error || !data) return { error: error?.message ?? 'Unable to complete invite setup.' }

  const row = Array.isArray(data) ? data[0] : data
  const groupId = typeof row === 'string' ? row : (row as { group_id?: string })?.group_id
  if (!groupId) return { error: 'Unable to complete invite setup.' }
  return { ok: true, groupId }
}
