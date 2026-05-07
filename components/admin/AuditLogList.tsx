'use client'

import { useState, useMemo } from 'react'
import Avatar from '@/components/ui/Avatar'
import type { AuditEntry } from '@/lib/types'

interface AuditLogListProps {
  entries: AuditEntry[]
}

const ACTION_LABELS: Record<string, string> = {
  role_change:        'Role Change',
  ban:                'Ban',
  unban:              'Unban',
  delete_message:     'Delete Message',
  delete_group:       'Delete Group',
  report_reviewed:    'Report Reviewed',
  report_dismissed:   'Report Dismissed',
  transfer_ownership: 'Transfer Ownership',
}

function describeEntry(entry: AuditEntry): string {
  const m = entry.metadata ?? {}
  switch (entry.action) {
    case 'role_change':
      return `changed ${m.target_username}'s role from ${m.from_role} → ${m.to_role}`
    case 'ban':
      return `banned ${m.target_username}${m.reason ? ` (${m.reason})` : ''}`
    case 'unban':
      return `unbanned ${m.target_username}`
    case 'delete_message':
      return `deleted a message in channel ${m.channel_id}: "${m.message_preview}"`
    case 'delete_group':
      return `deleted group "${m.group_name}"`
    case 'report_reviewed':
      return `reviewed report ${m.report_id ?? entry.target_id}${m.reporter_username ? ` from @${m.reporter_username}` : ''}${m.message_preview ? `: "${m.message_preview}"` : ''}`
    case 'report_dismissed':
      return `dismissed report ${m.report_id ?? entry.target_id}${m.reporter_username ? ` from @${m.reporter_username}` : ''}${m.reason ? ` (${m.reason})` : ''}`
    case 'transfer_ownership':
      return `transferred ownership of "${m.group_name}" from ${m.from_user} to ${m.to_user}`
    default:
      return entry.action
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function exportCsv(entries: AuditEntry[]) {
  const rows = [
    ['ID', 'Admin', 'Action', 'Target Type', 'Target ID', 'Metadata', 'Date'],
    ...entries.map(e => [
      e.id,
      e.admin_username,
      e.action,
      e.target_type ?? '',
      e.target_id ?? '',
      JSON.stringify(e.metadata ?? {}),
      e.created_at,
    ]),
  ]
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const ALL_ACTIONS = Object.keys(ACTION_LABELS)

export default function AuditLogList({ entries }: AuditLogListProps) {
  const [filterAction, setFilterAction] = useState('all')

  const sorted = useMemo(
    () => [...entries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [entries]
  )

  const filtered = filterAction === 'all' ? sorted : sorted.filter(e => e.action === filterAction)

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          data-testid="audit-filter-action"
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          style={{
            padding: '6px 10px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <option value="all">All actions</option>
          {ALL_ACTIONS.map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a]}</option>
          ))}
        </select>

        <button
          data-testid="export-csv"
          onClick={() => exportCsv(filtered)}
          style={{
            padding: '6px 14px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: 32 }}>
          No audit entries found.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filtered.map(entry => (
            <div
              key={entry.id}
              className="audit-entry"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <Avatar
                user={{ avatar_url: entry.admin_avatar_url, username: entry.admin_username, display_name: null }}
                size={32}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                  <strong>{entry.admin_username}</strong>
                  {' '}
                  {describeEntry(entry)}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: 0 }}>
                  {formatDate(entry.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
