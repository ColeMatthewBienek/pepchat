import { createClient } from '@/lib/supabase/server'
import GroupTable from '@/components/admin/GroupTable'
import { deleteGroup, transferOwnership } from '@/app/admin/actions'
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

  async function handleDelete(groupId: string) {
    'use server'
    const group = groups.find(g => g.id === groupId)
    await deleteGroup(groupId, group?.name ?? groupId)
  }

  async function handleTransfer(groupId: string, newOwnerId: string) {
    'use server'
    const group = groups.find(g => g.id === groupId)
    if (!group) return
    const supabase2 = await createClient()
    const { data: newOwner } = await supabase2.from('profiles').select('username').eq('id', newOwnerId).single()
    await transferOwnership(groupId, group.name, newOwnerId, group.owner_username, (newOwner as any)?.username ?? newOwnerId)
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>
        Groups
      </h1>
      <GroupTable
        groups={groups}
        onDelete={handleDelete}
        onTransferOwnership={handleTransfer}
      />
    </div>
  )
}
