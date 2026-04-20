'use client'

import type { AdminReport } from '@/lib/types'

interface ReportsTableProps {
  reports: AdminReport[]
  onMarkReviewed: (reportId: string) => Promise<void>
  onDismiss: (reportId: string) => Promise<void>
  onDeleteMessage: (messageId: string) => Promise<void>
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  pending:    { color: '#d89a3a', background: 'rgba(216,154,58,0.12)' },
  reviewed:   { color: '#6aa08a', background: 'rgba(106,160,138,0.12)' },
  dismissed:  { color: 'var(--text-faint)', background: 'var(--bg-tertiary)' },
}

export default function ReportsTable({ reports, onMarkReviewed, onDismiss, onDeleteMessage }: ReportsTableProps) {
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
        {reports.map(report => (
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
                <button title="mark reviewed" onClick={() => onMarkReviewed(report.id)} style={actionBtn('#6aa08a')}>✓</button>
                <button title="dismiss" onClick={() => onDismiss(report.id)} style={actionBtn('var(--text-faint)')}>✕</button>
                <button title="delete message" onClick={() => onDeleteMessage(report.message_id)} style={actionBtn('var(--danger)')}>🗑</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
