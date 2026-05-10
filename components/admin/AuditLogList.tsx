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
  reset_password:     'Password Reset',
  report_reviewed:    'Report Reviewed',
  report_dismissed:   'Report Dismissed',
  group_details_updated: 'Group Details Updated',
  group_icon_updated:    'Group Icon Updated',
  group_icon_removed:    'Group Icon Removed',
  invite_regenerated:    'Invite Created',
  invite_revoked:        'Invite Revoked',
  member_role_changed:   'Member Role Changed',
  member_kicked:         'Member Kicked',
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
    case 'reset_password':
      return `sent a password reset email to ${m.target_username ?? entry.target_id}`
    case 'report_reviewed':
      return `reviewed report ${m.report_id ?? entry.target_id}${m.reporter_username ? ` from @${m.reporter_username}` : ''}${m.message_preview ? `: "${m.message_preview}"` : ''}`
    case 'report_dismissed':
      return `dismissed report ${m.report_id ?? entry.target_id}${m.reporter_username ? ` from @${m.reporter_username}` : ''}${m.reason ? ` (${m.reason})` : ''}`
    case 'group_details_updated':
      return `updated group details${m.name ? ` for "${m.name}"` : ''}`
    case 'group_icon_updated':
      return `updated a group icon${m.icon_ext ? ` (${m.icon_ext})` : ''}`
    case 'group_icon_removed':
      return 'removed a group icon'
    case 'invite_regenerated':
      return `created an invite${m.group_id ? ` for group ${m.group_id}` : ''}${m.max_uses ? `, limited to ${m.max_uses} uses` : ''}${m.expires_at ? `, expiring ${new Date(String(m.expires_at)).toLocaleDateString()}` : ''}`
    case 'invite_revoked':
      return `revoked invite ${entry.target_id}${m.group_id ? ` for group ${m.group_id}` : ''}`
    case 'member_role_changed':
      return `changed member ${entry.target_id} from ${m.from_role} → ${m.to_role}${m.group_id ? ` in group ${m.group_id}` : ''}`
    case 'member_kicked':
      return `removed member ${entry.target_id}${m.group_id ? ` from group ${m.group_id}` : ''}`
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
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const sorted = useMemo(
    () => [...entries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [entries]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const startTime = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null
    const endTime = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null

    return sorted.filter(entry => {
      if (filterAction !== 'all' && entry.action !== filterAction) return false
      const entryTime = new Date(entry.created_at).getTime()
      if (startTime !== null && entryTime < startTime) return false
      if (endTime !== null && entryTime > endTime) return false
      if (!q) return true

      const haystack = [
        entry.admin_username,
        entry.action,
        ACTION_LABELS[entry.action] ?? '',
        entry.target_type ?? '',
        entry.target_id ?? '',
        describeEntry(entry),
        JSON.stringify(entry.metadata ?? {}),
      ].join(' ').toLowerCase()

      return haystack.includes(q)
    })
  }, [endDate, filterAction, search, sorted, startDate])

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

        <input
          data-testid="audit-search"
          type="search"
          placeholder="Search audit log..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            minWidth: 220,
            flex: '1 1 260px',
            padding: '6px 10px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: 13,
            outline: 'none',
          }}
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          From
          <input
            data-testid="audit-start-date"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={{
              padding: '5px 8px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          To
          <input
            data-testid="audit-end-date"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            style={{
              padding: '5px 8px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </label>

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
