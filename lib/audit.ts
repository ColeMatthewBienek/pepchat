type AuditClient = {
  from: (table: string) => {
    insert?: (payload: Record<string, unknown>) => unknown
  }
}

export async function logAuditEvent(
  supabase: AuditClient,
  adminId: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  metadata: Record<string, unknown> = {},
) {
  try {
    await supabase.from('audit_log').insert?.({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata,
    })
  } catch {
    // Audit failures should never block the primary moderation or admin action.
  }
}
