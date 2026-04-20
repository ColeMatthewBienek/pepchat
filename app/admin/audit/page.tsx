import { createClient } from '@/lib/supabase/server'
import AuditLogList from '@/components/admin/AuditLogList'
import type { AuditEntry } from '@/lib/types'

export const runtime = 'edge'

export default async function AuditPage() {
  const supabase = await createClient()

  const { data: rawEntries } = await supabase
    .from('audit_log')
    .select(`
      id, action, target_type, target_id, metadata, created_at, admin_id,
      profiles!audit_log_admin_id_fkey(username, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  const entries: AuditEntry[] = (rawEntries ?? []).map((e: any) => ({
    id: e.id,
    admin_id: e.admin_id,
    admin_username: e.profiles?.username ?? 'unknown',
    admin_avatar_url: e.profiles?.avatar_url ?? null,
    action: e.action,
    target_type: e.target_type,
    target_id: e.target_id,
    metadata: e.metadata,
    created_at: e.created_at,
  }))

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>
        Audit Log
      </h1>
      <AuditLogList entries={entries} />
    </div>
  )
}
