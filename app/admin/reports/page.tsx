import { createClient } from '@/lib/supabase/server'
import ReportsTable from '@/components/admin/ReportsTable'
import { markReportReviewed, dismissReport } from '@/app/admin/actions'
import { deleteMessage } from '@/app/(app)/messages/actions'
import type { AdminReport } from '@/lib/types'

export const runtime = 'edge'

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: rawReports } = await supabase
    .from('reports')
    .select(`
      id, message_id, reason, status, created_at,
      reported_by,
      messages(content),
      profiles!reports_reported_by_fkey(username)
    `)
    .order('created_at', { ascending: false })

  const reports: AdminReport[] = (rawReports ?? []).map((r: any) => ({
    id: r.id,
    message_id: r.message_id,
    message_content: r.messages?.content ?? '[deleted]',
    reported_by: r.reported_by,
    reporter_username: r.profiles?.username ?? 'unknown',
    reason: r.reason,
    status: r.status as AdminReport['status'],
    created_at: r.created_at,
  }))

  async function handleMarkReviewed(reportId: string) {
    'use server'
    await markReportReviewed(reportId)
  }

  async function handleDismiss(reportId: string) {
    'use server'
    await dismissReport(reportId)
  }

  async function handleDeleteMessage(messageId: string) {
    'use server'
    await deleteMessage(messageId)
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>
        Reports
      </h1>
      <ReportsTable
        reports={reports}
        onMarkReviewed={handleMarkReviewed}
        onDismiss={handleDismiss}
        onDeleteMessage={handleDeleteMessage}
      />
    </div>
  )
}
