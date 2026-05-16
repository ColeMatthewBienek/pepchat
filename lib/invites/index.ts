import type { SupabaseClient } from '@supabase/supabase-js'

export type InviteRecord = {
  id: string
  group_id: string
  code: string
  created_by: string | null
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  revoked_at: string | null
  created_at: string
  profiles?: { username: string | null } | null
}

export type ManagedInvite = {
  kind: 'managed'
  invite: InviteRecord
  groupId: string
}

export type LegacyInvite = {
  kind: 'legacy'
  code: string
  groupId: string
}

export type ResolvedInvite = ManagedInvite | LegacyInvite

export type InviteResolveResult =
  | { ok: true; invite: ResolvedInvite }
  | { ok: false; reason: 'missing_code' | 'not_found' | 'unusable'; message: string }

export type InviteConsumeResult =
  | { ok: true; groupId: string; joined: boolean }
  | { ok: false; message: string }

export type RegenerateInviteOptions = {
  max_uses: number | null
  expires_at: string | null
}

export function generateInviteCode(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

export function normalizeInviteCode(value: string) {
  const trimmed = value.trim()
  const match = trimmed.match(/\/join\/([^/?#]+)/)
  return decodeURIComponent(match?.[1] ?? trimmed).trim()
}

export function parseInviteOptions(formData?: FormData): RegenerateInviteOptions | { error: string } {
  const maxUsesRaw = formData?.get('max_uses')?.toString().trim() ?? ''
  const expiresRaw = formData?.get('expires_at')?.toString().trim() ?? ''
  const max_uses = maxUsesRaw ? Number(maxUsesRaw) : null

  if (max_uses !== null && (!Number.isInteger(max_uses) || max_uses < 1 || max_uses > 1000)) {
    return { error: 'Usage limit must be between 1 and 1000.' }
  }

  let expires_at: string | null = null
  if (expiresRaw) {
    const expiresAt = new Date(expiresRaw)
    if (Number.isNaN(expiresAt.getTime())) return { error: 'Expiration date is invalid.' }
    if (expiresAt.getTime() <= Date.now()) return { error: 'Expiration date must be in the future.' }
    expires_at = expiresAt.toISOString()
  }

  return { max_uses, expires_at }
}

export function inviteIsUsable(
  invite: Pick<InviteRecord, 'revoked_at' | 'expires_at' | 'max_uses' | 'uses_count'>,
  now = Date.now(),
) {
  if (invite.revoked_at) return false
  if (invite.expires_at && new Date(invite.expires_at).getTime() <= now) return false
  if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) return false
  return true
}

export async function resolveInvite(
  supabase: SupabaseClient,
  code: string,
  opts: { now?: number; authoritativeSupabase?: SupabaseClient } = {},
): Promise<InviteResolveResult> {
  const inviteCode = normalizeInviteCode(code)
  if (!inviteCode) {
    return { ok: false, reason: 'missing_code', message: 'Invite code is required.' }
  }

  const inviteClient = opts.authoritativeSupabase ?? supabase
  const { data: managedInvite } = await inviteClient
    .from('group_invites')
    .select('id, group_id, code, created_by, max_uses, uses_count, expires_at, revoked_at, created_at')
    .eq('code', inviteCode)
    .single()

  if (managedInvite) {
    const invite = managedInvite as InviteRecord
    if (!inviteIsUsable(invite, opts.now)) {
      return { ok: false, reason: 'unusable', message: 'Invite link has expired or reached its usage limit.' }
    }
    return { ok: true, invite: { kind: 'managed', invite, groupId: invite.group_id } }
  }

  const { data: legacyGroup } = await supabase
    .from('groups')
    .select('id')
    .eq('invite_code', inviteCode)
    .single()

  if (!legacyGroup) {
    return { ok: false, reason: 'not_found', message: 'Invalid invite code.' }
  }

  return { ok: true, invite: { kind: 'legacy', code: inviteCode, groupId: (legacyGroup as { id: string }).id } }
}

export async function consumeInvite(
  supabase: SupabaseClient,
  invite: ResolvedInvite,
  userId: string,
): Promise<InviteConsumeResult> {
  const groupId = invite.groupId
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single()

  if (existing) return { ok: true, groupId, joined: false }

  const { error } = await supabase.from('group_members').insert({
    group_id: groupId,
    user_id: userId,
    role: 'noob',
  })
  if (error) return { ok: false, message: error.message }

  if (invite.kind === 'managed') {
    await supabase.from('group_invite_uses').insert({
      invite_id: invite.invite.id,
      group_id: invite.invite.group_id,
      user_id: userId,
    })
    await supabase
      .from('group_invites')
      .update({ uses_count: invite.invite.uses_count + 1 })
      .eq('id', invite.invite.id)
  }

  return { ok: true, groupId, joined: true }
}

export async function regenerateInvite(
  supabase: SupabaseClient,
  input: { groupId: string; createdBy: string; options: RegenerateInviteOptions },
): Promise<{ ok: true; invite_code: string; invite: InviteRecord } | { error: string }> {
  const invite_code = generateInviteCode()
  const { data: invite, error: inviteError } = await supabase
    .from('group_invites')
    .insert({
      group_id: input.groupId,
      code: invite_code,
      created_by: input.createdBy,
      max_uses: input.options.max_uses,
      expires_at: input.options.expires_at,
    })
    .select()
    .single()

  if (inviteError || !invite) return { error: inviteError?.message ?? 'Failed to create invite.' }
  return { ok: true, invite_code, invite: invite as InviteRecord }
}

export async function listInvites(
  supabase: SupabaseClient,
  groupId: string,
): Promise<{ ok: true; invites: InviteRecord[]; uses: any[] } | { error: string }> {
  const { data: invites, error: invitesError } = await supabase
    .from('group_invites')
    .select('*, profiles!group_invites_created_by_fkey(username)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (invitesError) return { error: invitesError.message }

  const { data: uses, error: usesError } = await supabase
    .from('group_invite_uses')
    .select('*, group_invites(code), profiles(username)')
    .eq('group_id', groupId)
    .order('used_at', { ascending: false })
    .limit(25)

  if (usesError) return { error: usesError.message }

  return { ok: true, invites: (invites ?? []) as InviteRecord[], uses: uses ?? [] }
}

export async function revokeInvite(
  supabase: SupabaseClient,
  input: { inviteId: string; groupId: string },
): Promise<{ ok: true } | { error: string }> {
  const { data: invite, error: lookupError } = await supabase
    .from('group_invites')
    .select('code')
    .eq('id', input.inviteId)
    .eq('group_id', input.groupId)
    .single()

  if (lookupError || !invite) return { error: lookupError?.message ?? 'Invite not found.' }

  const { error } = await supabase
    .from('group_invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', input.inviteId)
    .eq('group_id', input.groupId)

  if (error) return { error: error.message }

  const revokedCode = (invite as { code: string }).code
  const { data: group } = await supabase
    .from('groups')
    .select('invite_code')
    .eq('id', input.groupId)
    .single()

  if ((group as { invite_code?: string } | null)?.invite_code === revokedCode) {
    const { error: legacyError } = await supabase
      .from('groups')
      .update({ invite_code: generateInviteCode() })
      .eq('id', input.groupId)

    if (legacyError) return { error: legacyError.message }
  }

  return { ok: true }
}
