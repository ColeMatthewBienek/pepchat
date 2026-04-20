import { createClient } from '@/lib/supabase/server'
import UserTable from '@/components/admin/UserTable'
import type { AdminUser } from '@/lib/types'
import type { Role } from '@/lib/permissions'

export const runtime = 'edge'

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: { user: me } } = await supabase.auth.getUser()

  const [{ data: members }, { data: bannedRows }] = await Promise.all([
    supabase
      .from('group_members')
      .select(`
        user_id, role, joined_at, group_id,
        profiles(id, username, display_name, avatar_url)
      `)
      .order('joined_at', { ascending: false }),
    supabase.from('banned_users').select('user_id'),
  ])

  const bannedIds = new Set((bannedRows ?? []).map((b: any) => b.user_id))

  // One row per user (first occurrence = first group they joined)
  const seen = new Set<string>()
  const users: AdminUser[] = []
  for (const m of (members ?? []) as any[]) {
    if (seen.has(m.user_id)) continue
    seen.add(m.user_id)
    users.push({
      id: m.user_id,
      username: m.profiles?.username ?? m.user_id,
      display_name: m.profiles?.display_name ?? null,
      avatar_url: m.profiles?.avatar_url ?? null,
      role: m.role as Role,
      group_id: m.group_id,
      joined_at: m.joined_at,
      last_active: null,
      is_banned: bannedIds.has(m.user_id),
    })
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>
        Users
      </h1>
      <UserTable users={users} currentUserId={me?.id ?? ''} />
    </div>
  )
}
