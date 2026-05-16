import type { SupabaseClient } from '@supabase/supabase-js'
import type { Role, RolePredicate } from '@/lib/permissions'

export type GroupRoleGateResult =
  | { ok: true; membership: { role: Role } }
  | { error: string }

export async function gateGroupRole(
  supabase: SupabaseClient,
  input: {
    groupId: string
    userId: string
    predicate: RolePredicate
    deniedMessage: string
  }
): Promise<GroupRoleGateResult> {
  const { data: membership, error } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', input.groupId)
    .eq('user_id', input.userId)
    .single()

  if (error && error.code !== 'PGRST116') return { error: error.message }

  const role = membership?.role as Role | undefined
  if (!role || !input.predicate(role)) {
    return { error: input.deniedMessage }
  }

  return { ok: true, membership: { role } }
}
