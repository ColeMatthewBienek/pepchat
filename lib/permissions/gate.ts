import type { SupabaseClient } from '@supabase/supabase-js'
import type { Role, RolePredicate } from '@/lib/permissions'

export type GroupRoleGateResult =
  | { ok: true; membership: { role: Role } }
  | { error: string }

/**
 * Server-side group-role gate.
 *
 * Queries `group_members` for the caller row and evaluates the provided
 * permission predicate. Does *not* call auth.getUser() — compose with
 * `withAuth` so that authentication is handled once upstream.
 */
export async function gateGroupRole(
  supabase: SupabaseClient,
  input: {
    groupId: string
    userId: string
    predicate: RolePredicate
    deniedMessage: string
  }
): Promise<GroupRoleGateResult> {
  const { data: membership, error: lookupError } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', input.groupId)
    .eq('user_id', input.userId)
    .single()

  if (lookupError) {
    return { error: lookupError.message }
  }

  const role = membership?.role as Role | undefined
  if (!role || !input.predicate(role)) {
    return { error: input.deniedMessage }
  }

  return { ok: true, membership: { role } }
}
