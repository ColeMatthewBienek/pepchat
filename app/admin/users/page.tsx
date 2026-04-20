import { createClient } from '@/lib/supabase/server'
import UserTable from '@/components/admin/UserTable'
import { changeRole, banUser, unbanUser, resetPassword } from '@/app/admin/actions'
import type { AdminUser } from '@/lib/types'
import type { Role } from '@/lib/permissions'

export const runtime = 'edge'

export default async function UsersPage() {
  const supabase = await createClient()

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

  // Deduplicate — one row per user (take first occurrence = highest role group)
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
      joined_at: m.joined_at,
      last_active: null,
      is_banned: bannedIds.has(m.user_id),
    })
  }

  // Fetch emails for password reset via auth admin — not available on edge without service role
  // Email is fetched client-side per action when needed

  async function handleRoleChange(userId: string, role: Role) {
    'use server'
    const user = users.find(u => u.id === userId)
    if (!user) return
    // Find the group_id for this user — use first group
    const member = (members ?? []).find((m: any) => m.user_id === userId)
    if (!member) return
    await changeRole(userId, (member as any).group_id, role, user.username, user.role)
  }

  async function handleBan(userId: string, reason: string) {
    'use server'
    const user = users.find(u => u.id === userId)
    if (!user) return
    await banUser(userId, user.username, reason)
  }

  async function handleUnban(userId: string) {
    'use server'
    const user = users.find(u => u.id === userId)
    if (!user) return
    await unbanUser(userId, user.username)
  }

  async function handleResetPassword(userId: string) {
    'use server'
    // Fetch the user's email from auth (requires service role or admin client)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createAdminClient()
    const { data } = await adminClient.auth.admin.getUserById(userId)
    if (data?.user?.email) {
      await resetPassword(userId, data.user.email)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>
        Users
      </h1>
      <UserTable
        users={users}
        currentUserId=""
        onRoleChange={handleRoleChange}
        onBan={handleBan}
        onUnban={handleUnban}
        onResetPassword={handleResetPassword}
      />
    </div>
  )
}
