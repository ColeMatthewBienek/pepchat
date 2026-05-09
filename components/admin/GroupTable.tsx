'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import GroupIcon from '@/components/ui/GroupIcon'
import { deleteGroup } from '@/app/admin/actions'
import type { AdminGroup } from '@/lib/types'

interface GroupTableProps {
  groups: AdminGroup[]
  onDelete?: (groupId: string) => Promise<void>
}

export default function GroupTable({ groups, onDelete }: GroupTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filteredGroups = groups.filter(group => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      group.name.toLowerCase().includes(q) ||
      group.owner_username.toLowerCase().includes(q)
    )
  })

  async function doDelete(groupId: string) {
    setPending(groupId)
    setError(null)
    try {
      if (onDelete) {
        await onDelete(groupId)
      } else {
        const group = groups.find(g => g.id === groupId)
        const result = await deleteGroup(groupId, group?.name ?? groupId)
        if ('error' in result) throw new Error(result.error)
        router.refresh()
      }
      setConfirmDelete(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group.')
    } finally {
      setPending(null)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (groups.length === 0) {
    return (
      <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: 32 }}>
        No groups on this platform yet.
      </p>
    )
  }

  return (
    <div>
      {error && (
        <p style={{ fontSize: 13, color: 'var(--danger)', background: 'rgba(201,74,42,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: 12 }}>
          {error}
        </p>
      )}
      <input
        className="group-search"
        type="text"
        placeholder="Search groups..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          marginBottom: 16,
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          fontSize: 14,
          outline: 'none',
        }}
      />
      {filteredGroups.length === 0 ? (
        <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: 32 }}>
          No groups match the current search.
        </p>
      ) : (
      <div className="table-scroll-wrapper">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-soft)' }}>
            {['Group', 'Owner', 'Members', 'Channels', 'Created', 'Actions'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '6px 12px', fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredGroups.map(group => (
            <tr key={group.id} className="group-row" style={{ borderBottom: '1px solid var(--border-soft)', opacity: pending === group.id ? 0.5 : 1 }}>
              <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <GroupIcon group={{ name: group.name, icon_url: group.icon_url }} size={32} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{group.name}</span>
                </div>
              </td>
              <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                @{group.owner_username}
              </td>
              <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                {group.member_count}
              </td>
              <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                {group.channel_count}
              </td>
              <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-faint)' }}>
                {formatDate(group.created_at)}
              </td>
              <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <a
                    href={`/groups/${group.id}`}
                    aria-label={`View ${group.name}`}
                    style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}
                  >
                    View
                  </a>
                  <button
                    title="delete group"
                    aria-label={`Delete ${group.name}`}
                    onClick={() => setConfirmDelete(group.id)}
                    style={{ fontSize: 12, color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      )}

      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setConfirmDelete(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)', padding: 24, width: 340,
          }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
              Are you sure?
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
              This will permanently delete the group, all its channels and messages. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                data-testid="confirm-delete-group"
                disabled={pending === confirmDelete}
                onClick={() => doDelete(confirmDelete)}
                style={{ flex: 1, padding: '8px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: pending === confirmDelete ? 'not-allowed' : 'pointer', opacity: pending === confirmDelete ? 0.65 : 1 }}
              >
                Delete
              </button>
              <button
                data-testid="cancel-delete-group"
                onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: '8px', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
