import type { SupabaseClient } from '@supabase/supabase-js'

export interface AuditInsert {
  admin_id: string
  action: string
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown>
}

/**
 * Writes an audit row. Throws on failure so callers (or the side-effect
 * wrapper) can decide whether to bubble or downgrade.
 *
 * This replaces the previous silently-swallowing version. If you need
 * silent behaviour, use the `withSideEffects` wrapper with
 * `onFailure: 'silent'` or `onFailure: 'downgrade'`.
 */
export async function logAuditEvent(
  supabase: SupabaseClient,
  adminId: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase
    .from('audit_log')
    .insert({ admin_id: adminId, action, target_type: targetType, target_id: targetId, metadata })

  if (error) {
    console.error('[Audit] Failed to write row', error)
    throw new Error(`Audit log insert failed: ${error.message}`)
  }
}
