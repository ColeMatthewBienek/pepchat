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
    { data: recentMessages },
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
  ])

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>
        Admin Dashboard
      </h1>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32, maxWidth: 640 }}>
        <MetricCard label="Total Users"    value={totalUsers ?? null} />
        <MetricCard label="Active Today"   value={activeToday ?? null} />
        <MetricCard label="Total Groups"   value={totalGroups ?? null} />
        <MetricCard label="Messages Today" value={messagesToday ?? null} />
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
