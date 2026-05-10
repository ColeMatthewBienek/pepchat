import { createClient } from '@/lib/supabase/server'
import MetricCard from '@/components/admin/MetricCard'

export const runtime = 'edge'

export default async function OverviewPage() {
  const supabase = await createClient()

  const [
    { count: totalUsers },
    { count: activeToday },
    { count: totalGroups },
    { count: messagesToday },
    { count: pendingReports },
    { count: noobMembers },
    { count: invitesCreated },
    { count: invitesUsed },
    { data: recentMessages },
    { data: quietMembers },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('messages')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', new Date().toISOString().split('T')[0]),
    supabase.from('groups').select('*', { count: 'exact', head: true }),
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date().toISOString().split('T')[0])
      .eq('is_system', false),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('role', 'noob'),
    supabase.from('group_invites').select('*', { count: 'exact', head: true }),
    supabase.from('group_invites').select('*', { count: 'exact', head: true }).gt('uses_count', 0),
    supabase
      .from('messages')
      .select(`
        id, content, created_at, user_id, is_system,
        profiles(username),
        channels(name)
      `)
      .eq('is_system', false)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('profiles')
      .select('id, username, updated_at')
      .order('updated_at', { ascending: true, nullsFirst: true })
      .limit(8),
  ])

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>
        Admin Dashboard
      </h1>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 32 }}>
        <MetricCard label="Total Users"    value={totalUsers ?? null} />
        <MetricCard label="Active Today"   value={activeToday ?? null} />
        <MetricCard label="Total Groups"   value={totalGroups ?? null} />
        <MetricCard label="Messages Today" value={messagesToday ?? null} />
        <MetricCard label="Pending Reports" value={pendingReports ?? null} />
        <MetricCard label="Noob Members" value={noobMembers ?? null} />
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
        Community Health
      </h2>
      <div
        data-testid="community-health"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0 }}>
            Onboarding Funnel
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
            <HealthStep label="Invited" value={invitesCreated ?? 0} />
            <HealthStep label="Joined" value={totalUsers ?? 0} />
            <HealthStep label="Active" value={activeToday ?? 0} />
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
            {invitesUsed ?? 0} invite {invitesUsed === 1 ? 'link has' : 'links have'} recorded usage.
          </p>
        </div>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0 }}>
            Quiet Accounts
          </p>
          {(quietMembers ?? []).length === 0 ? (
            <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--text-faint)' }}>No account data.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              {(quietMembers ?? []).map((member: any) => (
                <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>@{member.username ?? 'unknown'}</span>
                  <span style={{ color: 'var(--text-faint)' }}>{formatQuietDate(member.updated_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
        Recent Activity
      </h2>
      <div
        data-testid="activity-feed"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          maxHeight: 480,
          overflowY: 'auto',
        }}
      >
        {(recentMessages ?? []).length === 0 ? (
          <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: 32 }}>
            No recent messages.
          </p>
        ) : (
          (recentMessages ?? []).map((msg: any) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: 12,
                padding: '10px 16px',
                borderBottom: '1px solid var(--border-soft)',
                fontSize: 13,
              }}
            >
              <span style={{ color: 'var(--text-faint)', whiteSpace: 'nowrap', fontSize: 11, paddingTop: 2 }}>
                #{msg.channels?.name ?? '?'}
              </span>
              <span style={{ color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {msg.profiles?.username ?? 'unknown'}
              </span>
              <span style={{ flex: 1, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {msg.content}
              </span>
              <span style={{ color: 'var(--text-faint)', fontSize: 11, whiteSpace: 'nowrap', paddingTop: 2 }}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function HealthStep({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)', padding: '8px 10px', background: 'var(--bg-tertiary)' }}>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</p>
      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-faint)' }}>{label}</p>
    </div>
  )
}

function formatQuietDate(iso: string | null) {
  if (!iso) return 'No activity'
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}
