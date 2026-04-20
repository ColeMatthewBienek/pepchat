import { createClient } from '@/lib/supabase/server'
import GroupTable from '@/components/admin/GroupTable'
import type { AdminGroup } from '@/lib/types'

export const runtime = 'edge'

export default async function GroupsPage() {
  const supabase = await createClient()

  const { data: rawGroups } = await supabase
    .from('groups')
    .select(`
      id, name, icon_url, owner_id, created_at,
      profiles!groups_owner_id_fkey(username),
      group_members(count)
    `)
    .order('created_at', { ascending: false })

  const { data: channelCounts } = await supabase
    .from('channels')
    .select('group_id')

  const channelsByGroup = (channelCounts ?? []).reduce<Record<string, number>>((acc: any, c: any) => {
    acc[c.group_id] = (acc[c.group_id] ?? 0) + 1
    return acc
  }, {})

  const groups: AdminGroup[] = (rawGroups ?? []).map((g: any) => ({
    id: g.id,
    name: g.name,
    icon_url: g.icon_url,
    owner_id: g.owner_id,
    owner_username: g.profiles?.username ?? g.owner_id,
    member_count: g.group_members?.[0]?.count ?? 0,
    channel_count: channelsByGroup[g.id] ?? 0,
    created_at: g.created_at,
  }))

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>
        Groups
      </h1>
      <GroupTable groups={groups} />
    </div>
  )
}
