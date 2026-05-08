import { createClient } from '@/lib/supabase/server'
import ReportsTable from '@/components/admin/ReportsTable'
import type { AdminReport } from '@/lib/types'

export const runtime = 'edge'

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: rawReports } = await supabase
    .from('reports')
    .select(`
      id, message_id, reason, status, created_at,
      reported_by,
      messages(
        content,
        channel_id,
        user_id,
        channels(name),
        profiles(username)
      ),
      profiles!reports_reported_by_fkey(username)
    `)
    .order('created_at', { ascending: false })

  const reports: AdminReport[] = (rawReports ?? []).map((r: any) => ({
    id: r.id,
    message_id: r.message_id,
    message_content: r.messages?.content ?? '[deleted]',
    message_author_id: r.messages?.user_id ?? null,
    message_author_username: r.messages?.profiles?.username ?? null,
    channel_id: r.messages?.channel_id ?? null,
    channel_name: r.messages?.channels?.name ?? null,
    reported_by: r.reported_by,
    reporter_username: r.profiles?.username ?? 'unknown',
    reason: r.reason,
    status: r.status as AdminReport['status'],
    created_at: r.created_at,
  }))

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>
        Reports
      </h1>
      <ReportsTable reports={reports} />
    </div>
  )
}
