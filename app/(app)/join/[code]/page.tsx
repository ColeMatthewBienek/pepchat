import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Handles invite links: /join/[code]
 * Adds the user to the group and redirects to the first channel.
 */
export default async function JoinPage({
  params,
}: {
  params: { code: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/join/${params.code}`)

  const { data: group } = await supabase
    .from('groups')
    .select('id')
    .eq('invite_code', params.code)
    .single()

  if (!group) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[var(--danger)]">Invalid or expired invite link.</p>
      </div>
    )
  }

  // Already a member?
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      role: 'noob',
    })
  }

  redirect(`/groups/${group.id}`)
}
