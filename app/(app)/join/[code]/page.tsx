import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function InviteMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full items-center justify-center px-6" style={{ background: 'var(--bg-chat)' }}>
      <div className="w-full max-w-sm rounded-lg border border-[var(--border-soft)] bg-[var(--bg-secondary)] p-5 text-center">
        <h1 className="text-lg font-bold text-[var(--text-primary)]">{title}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{body}</p>
      </div>
    </div>
  )
}

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
  if (!user) redirect(`/login?next=${encodeURIComponent(`/join/${params.code}`)}`)

  const { data: invite } = await supabase
    .from('group_invites')
    .select('id, group_id, max_uses, uses_count, expires_at, revoked_at')
    .eq('code', params.code)
    .single()

  const { data: legacyGroup } = invite ? { data: null } : await supabase
    .from('groups')
    .select('id')
    .eq('invite_code', params.code)
    .single()

  const group = invite ? { id: invite.group_id } : legacyGroup
  if (!group) {
    return (
      <InviteMessage
        title="Invite not found"
        body="This invite link may have been revoked, mistyped, or replaced by a newer invite."
      />
    )
  }
  if (
    invite?.revoked_at ||
    (invite?.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) ||
    (invite && invite.max_uses !== null && invite.uses_count >= invite.max_uses)
  ) {
    return (
      <InviteMessage
        title="Invite expired"
        body="This invite is no longer accepting new members. Ask an admin for a fresh link."
      />
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

    if (invite) {
      await supabase.from('group_invite_uses').insert({
        invite_id: invite.id,
        group_id: invite.group_id,
        user_id: user.id,
      })
      await supabase
        .from('group_invites')
        .update({ uses_count: invite.uses_count + 1 })
        .eq('id', invite.id)
    }
  }

  redirect(`/groups/${group.id}`)
}
