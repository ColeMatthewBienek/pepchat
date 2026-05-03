'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import RolePill from '@/components/ui/RolePill'
import { changeRole, banUser, unbanUser, resetPassword } from '@/app/admin/actions'
import type { AdminUser } from '@/lib/types'
import type { Role } from '@/lib/permissions'

const PAGE_SIZE = 25

const ROLES: Role[] = ['admin', 'moderator', 'user', 'noob']

interface UserTableProps {
  users: AdminUser[]
  currentUserId: string
}

export default function UserTable({ users, currentUserId }: UserTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [banTarget, setBanTarget] = useState<string | null>(null)
  const [banReason, setBanReason] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return (
      u.username.toLowerCase().includes(q) ||
      (u.display_name ?? '').toLowerCase().includes(q)
    )
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageUsers = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  async function doRoleChange(user: AdminUser, role: Role) {
    setPending(user.id)
    setError(null)
    const result = await changeRole(user.id, user.group_id, role, user.username, user.role)
    setPending(null)
    setOpenMenuId(null)
    if ('error' in result) setError(result.error)
    else router.refresh()
  }

  async function doBan() {
    if (!banTarget) return
    const user = users.find(u => u.id === banTarget)
    if (!user) return
    setPending(banTarget)
    setError(null)
    const result = await banUser(banTarget, user.username, banReason)
    setPending(null)
    setBanTarget(null)
    setBanReason('')
    if ('error' in result) setError(result.error)
    else router.refresh()
  }

  async function doUnban(userId: string) {
    const user = users.find(u => u.id === userId)
    if (!user) return
    setPending(userId)
    setError(null)
    const result = await unbanUser(userId, user.username)
    setPending(null)
    if ('error' in result) setError(result.error)
    else router.refresh()
  }

  async function doResetPassword(user: AdminUser) {
    setPending(user.id)
    setError(null)
    const result = await resetPassword(user.id, user.username)
    setPending(null)
    setOpenMenuId(null)
    if ('error' in result) setError(result.error)
    else router.refresh()
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div>
      {error && (
        <p style={{ fontSize: 13, color: 'var(--danger)', background: 'rgba(201,74,42,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: 12 }}>
          {error}
        </p>
      )}
      <input
        className="user-search"
        type="text"
        placeholder="Search users…"
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(0) }}
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

      {pageUsers.length === 0 ? (
        <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: 32 }}>
          No users found.
        </p>
      ) : (
        <div className="table-scroll-wrapper">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-soft)' }}>
              {['User', 'Role', 'Member since', 'Last active', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 12px', fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageUsers.map(user => {
              const isSelf = user.id === currentUserId
              const targetIsAdmin = user.role === 'admin'
              return (
                <tr
                  key={user.id}
                  className="user-row"
                  style={{ borderBottom: '1px solid var(--border-soft)', opacity: pending === user.id ? 0.5 : 1 }}
                >
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar user={{ avatar_url: user.avatar_url, username: user.username, display_name: user.display_name }} size={32} />
                      <div>
                        {user.display_name && (
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{user.display_name}</div>
                        )}
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{user.username}</div>
                      </div>
                      {user.is_banned && (
                        <span style={{ fontSize: 10, background: 'rgba(201,74,42,0.15)', color: 'var(--danger)', padding: '1px 6px', borderRadius: 999, fontWeight: 600 }}>
                          Banned
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <RolePill role={user.role} />
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatDate(user.joined_at)}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>
                    {user.last_active ? formatDate(user.last_active) : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', position: 'relative' }}>
                    {!isSelf && !targetIsAdmin && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {user.is_banned ? (
                          <button onClick={() => doUnban(user.id)} style={actionStyle(false)}>
                            Unban User
                          </button>
                        ) : (
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button
                              title="actions"
                              onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: '2px 6px' }}
                            >
                              ···
                            </button>
                            {openMenuId === user.id && (
                              <div style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                zIndex: 50,
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-strong)',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: 'var(--shadow-xl)',
                                minWidth: 180,
                                padding: 4,
                              }}>
                                <div style={{ padding: '4px 10px', fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                  Change Role
                                </div>
                                {ROLES.map(r => (
                                  <button
                                    key={r}
                                    onClick={() => doRoleChange(user, r)}
                                    style={{
                                      display: 'block',
                                      width: '100%',
                                      textAlign: 'left',
                                      padding: '6px 10px',
                                      background: user.role === r ? 'var(--bg-tertiary)' : 'transparent',
                                      border: 'none',
                                      color: 'var(--text-primary)',
                                      fontSize: 13,
                                      cursor: 'pointer',
                                      borderRadius: 'var(--radius-sm)',
                                    }}
                                  >
                                    {r}
                                  </button>
                                ))}
                                <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 0' }} />
                                <button onClick={() => { setBanTarget(user.id); setOpenMenuId(null) }} style={actionStyle(true)}>
                                  Ban User
                                </button>
                                <button onClick={() => doResetPassword(user)} style={actionStyle(false)}>
                                  Reset Password
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      )}

      {/* Pagination */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', marginTop: 16 }}>
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          {filtered.length} users
        </span>
        <button
          onClick={() => setPage(p => p - 1)}
          disabled={page === 0}
          style={pageBtn}
        >
          Prev
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {page + 1} / {Math.max(1, totalPages)}
        </span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={page >= totalPages - 1}
          style={pageBtn}
        >
          Next
        </button>
      </div>

      {/* Ban confirmation dialog */}
      {banTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setBanTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)', padding: 24, width: 360,
          }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px' }}>
              Ban User?
            </p>
            <textarea
              placeholder="Reason (optional)"
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
              rows={3}
              style={{
                width: '100%', padding: '8px 12px', background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)', fontSize: 13, resize: 'none', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                data-testid="confirm-ban-user"
                onClick={doBan}
                style={{ flex: 1, padding: '8px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer' }}
              >
                Ban
              </button>
              <button
                onClick={() => setBanTarget(null)}
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

function actionStyle(danger: boolean): React.CSSProperties {
  return {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '6px 10px',
    background: 'transparent',
    border: 'none',
    color: danger ? 'var(--danger)' : 'var(--text-primary)',
    fontSize: 13,
    cursor: 'pointer',
    borderRadius: 'var(--radius-sm)',
  }
}

const pageBtn: React.CSSProperties = {
  padding: '4px 12px',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border-soft)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: 12,
  cursor: 'pointer',
}
