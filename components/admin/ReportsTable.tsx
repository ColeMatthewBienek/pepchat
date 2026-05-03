'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { markReportReviewed, dismissReport } from '@/app/admin/actions'
import { deleteMessage } from '@/app/(app)/messages/actions'
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

  const filteredReports = reports.filter(report => {
    if (statusFilter !== 'all' && report.status !== statusFilter) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      report.message_content.toLowerCase().includes(q) ||
      report.reporter_username.toLowerCase().includes(q) ||
      (report.reason ?? '').toLowerCase().includes(q)
    )
  })

  const statusCounts = {
    all: reports.length,
    pending: reports.filter(report => report.status === 'pending').length,
    reviewed: reports.filter(report => report.status === 'reviewed').length,
    dismissed: reports.filter(report => report.status === 'dismissed').length,
  }

  async function handleMarkReviewed(reportId: string) {
    if (onMarkReviewed) { await onMarkReviewed(reportId); return }
    await markReportReviewed(reportId)
    router.refresh()
  }

  async function handleDismiss(reportId: string) {
    if (onDismiss) { await onDismiss(reportId); return }
    await dismissReport(reportId)
    router.refresh()
  }

  async function handleDeleteMessage(messageId: string) {
    if (onDeleteMessage) { await onDeleteMessage(messageId); return }
    await deleteMessage(messageId)
    router.refresh()
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
          {['Message', 'Reported by', 'Reason', 'Status', 'Date', 'Actions'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '6px 12px', fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filteredReports.map(report => (
          <tr key={report.id} className="report-row" style={{ borderBottom: '1px solid var(--border-soft)' }}>
            <td style={{ padding: '10px 12px', maxWidth: 260 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {report.message_content}
              </span>
            </td>
            <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
              @{report.reporter_username}
            </td>
            <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
              {report.reason ?? '—'}
            </td>
            <td style={{ padding: '10px 12px' }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, ...STATUS_STYLE[report.status] }}>
                {report.status}
              </span>
            </td>
            <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
              {formatDate(report.created_at)}
            </td>
            <td style={{ padding: '10px 12px' }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button title="mark reviewed" onClick={() => handleMarkReviewed(report.id)} style={actionBtn('#6aa08a')}>✓</button>
                <button title="dismiss" onClick={() => handleDismiss(report.id)} style={actionBtn('var(--text-faint)')}>✕</button>
                <button title="delete message" onClick={() => handleDeleteMessage(report.message_id)} style={actionBtn('var(--danger)')}>🗑</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
    )}
    </div>
  )
}

function actionBtn(color: string): React.CSSProperties {
  return {
    background: 'transparent',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-sm)',
    color,
    fontSize: 12,
    cursor: 'pointer',
    padding: '3px 7px',
  }
}
