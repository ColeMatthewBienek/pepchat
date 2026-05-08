'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { markReportReviewed, dismissReport, deleteReportedMessage } from '@/app/admin/actions'
import type { AdminReport } from '@/lib/types'

interface ReportsTableProps {
  reports: AdminReport[]
  onMarkReviewed?: (reportId: string) => Promise<void>
  onDismiss?: (reportId: string) => Promise<void>
  onDeleteMessage?: (messageId: string) => Promise<void>
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  pending:    { color: '#d89a3a', background: 'rgba(216,154,58,0.12)' },
  reviewed:   { color: '#6aa08a', background: 'rgba(106,160,138,0.12)' },
  dismissed:  { color: 'var(--text-faint)', background: 'var(--bg-tertiary)' },
}

export default function ReportsTable({ reports, onMarkReviewed, onDismiss, onDeleteMessage }: ReportsTableProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<'all' | AdminReport['status']>('all')
  const [search, setSearch] = useState('')
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const filteredReports = reports.filter(report => {
    if (statusFilter !== 'all' && report.status !== statusFilter) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      report.message_content.toLowerCase().includes(q) ||
      report.reporter_username.toLowerCase().includes(q) ||
      (report.message_author_username ?? '').toLowerCase().includes(q) ||
      (report.channel_name ?? '').toLowerCase().includes(q) ||
      (report.reason ?? '').toLowerCase().includes(q)
    )
  })

  const statusCounts = {
    all: reports.length,
    pending: reports.filter(report => report.status === 'pending').length,
    reviewed: reports.filter(report => report.status === 'reviewed').length,
    dismissed: reports.filter(report => report.status === 'dismissed').length,
  }
  const activeCount = statusCounts.pending

  async function handleMarkReviewed(reportId: string) {
    setPendingAction(`review:${reportId}`)
    setError(null)
    setNotice(null)
    try {
      if (onMarkReviewed) {
        await onMarkReviewed(reportId)
      } else {
        const result = await markReportReviewed(reportId)
        if ('error' in result) throw new Error(result.error)
        router.refresh()
      }
      setNotice('Report marked as reviewed.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark report reviewed.')
    } finally {
      setPendingAction(null)
    }
  }

  async function handleDismiss(reportId: string) {
    setPendingAction(`dismiss:${reportId}`)
    setError(null)
    setNotice(null)
    try {
      if (onDismiss) {
        await onDismiss(reportId)
      } else {
        const result = await dismissReport(reportId)
        if ('error' in result) throw new Error(result.error)
        router.refresh()
      }
      setNotice('Report dismissed.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss report.')
    } finally {
      setPendingAction(null)
    }
  }

  async function handleDeleteMessage(report: AdminReport) {
    setPendingAction(`delete:${report.id}`)
    setError(null)
    setNotice(null)
    try {
      if (onDeleteMessage) {
        await onDeleteMessage(report.message_id)
      } else {
        const result = await deleteReportedMessage(report.id)
        if ('error' in result) throw new Error(result.error)
        router.refresh()
      }
      setNotice('Reported message deleted and report marked reviewed.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete reported message.')
    } finally {
      setPendingAction(null)
    }
  }

  if (reports.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 32px' }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
          No reports yet.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>
          When users report messages or content, they will appear here for review.
        </p>
      </div>
    )
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div>
    {error && (
      <p style={{ fontSize: 13, color: 'var(--danger)', background: 'rgba(201,74,42,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: 12 }}>
        {error}
      </p>
    )}
    {notice && (
      <p style={{ fontSize: 13, color: 'var(--success)', background: 'rgba(106,160,138,0.1)', border: '1px solid rgba(106,160,138,0.35)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: 12 }}>
        {notice}
      </p>
    )}
    <div
      data-testid="report-queue-summary"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 12px',
        marginBottom: 12,
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-tertiary)',
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          {activeCount} active {activeCount === 1 ? 'report' : 'reports'}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
          Reviewed and dismissed reports are kept for audit history.
        </p>
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {statusCounts.reviewed + statusCounts.dismissed} closed
      </span>
    </div>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(['all', 'pending', 'reviewed', 'dismissed'] as const).map(status => (
          <button
            key={status}
            type="button"
            data-testid={`report-filter-${status}`}
            onClick={() => setStatusFilter(status)}
            style={{
              padding: '5px 10px',
              borderRadius: 'var(--radius-sm)',
              border: statusFilter === status ? '1px solid var(--accent)' : '1px solid var(--border-soft)',
              background: statusFilter === status ? 'var(--accent-soft)' : 'var(--bg-tertiary)',
              color: statusFilter === status ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: 12,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {status} ({statusCounts[status]})
          </button>
        ))}
      </div>
      <input
        className="report-search"
        type="text"
        placeholder="Search reports..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          minWidth: 220,
          flex: '1 1 240px',
          maxWidth: 360,
          padding: '7px 10px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          fontSize: 13,
          outline: 'none',
        }}
      />
    </div>

    {filteredReports.length === 0 ? (
      <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: 32 }}>
        No reports match the current filters.
      </p>
    ) : (
    <div className="table-scroll-wrapper">
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border-soft)' }}>
          {['Message', 'Context', 'Reported by', 'Reason', 'Status', 'Date', 'Actions'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '6px 12px', fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filteredReports.map(report => {
          const reportLabel = `report ${report.id} from ${report.reporter_username}`
          const statusDescription = report.status === 'pending'
            ? 'Needs review'
            : report.status === 'reviewed'
              ? 'Reviewed'
              : 'Dismissed'
          const canAct = report.status === 'pending'

          return (
            <tr key={report.id} className="report-row" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <td style={{ padding: '10px 12px', maxWidth: 260 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {report.message_content}
                </span>
              </td>
              <td style={{ padding: '10px 12px', minWidth: 140 }}>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)' }}>
                  {report.message_author_username ? `@${report.message_author_username}` : 'Unknown author'}
                </span>
                <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: 'var(--text-faint)' }}>
                  {report.channel_name ? `#${report.channel_name}` : 'Unknown channel'}
                </span>
              </td>
              <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                @{report.reporter_username}
              </td>
              <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                {report.reason ?? '—'}
              </td>
              <td style={{ padding: '10px 12px' }}>
                <span
                  aria-label={`${statusDescription} report`}
                  style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, ...STATUS_STYLE[report.status] }}
                >
                  {statusDescription}
                </span>
              </td>
              <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
                {formatDate(report.created_at)}
              </td>
              <td style={{ padding: '10px 12px' }}>
                {canAct ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      title="mark reviewed"
                      disabled={pendingAction !== null}
                      onClick={() => handleMarkReviewed(report.id)}
                      aria-label={`Mark ${reportLabel} reviewed`}
                      style={actionBtn('#6aa08a', pendingAction !== null)}
                    >
                      ✓
                    </button>
                    <button
                      title="dismiss"
                      disabled={pendingAction !== null}
                      onClick={() => handleDismiss(report.id)}
                      aria-label={`Dismiss ${reportLabel}`}
                      style={actionBtn('var(--text-faint)', pendingAction !== null)}
                    >
                      ✕
                    </button>
                    <button
                      title="delete message"
                      disabled={pendingAction !== null}
                      onClick={() => handleDeleteMessage(report)}
                      aria-label={`Delete message for ${reportLabel}`}
                      style={actionBtn('var(--danger)', pendingAction !== null)}
                    >
                      🗑
                    </button>
                  </div>
                ) : (
                  <span
                    data-testid={`report-actions-closed-${report.id}`}
                    style={{ fontSize: 12, color: 'var(--text-faint)' }}
                  >
                    Closed
                  </span>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
    </div>
    )}
    </div>
  )
}

function actionBtn(color: string, disabled = false): React.CSSProperties {
  return {
    background: 'transparent',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-sm)',
    color,
    fontSize: 12,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    padding: '3px 7px',
  }
}
