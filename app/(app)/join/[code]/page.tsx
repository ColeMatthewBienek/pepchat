import { redirect } from 'next/navigation'
import { consumeInvite, resolveInvite } from '@/lib/invites'
import { inviteLookupClient } from '@/lib/invites/lookupClient'
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

  const resolved = await resolveInvite(supabase, params.code, {
    authoritativeSupabase: inviteLookupClient(supabase),
  })

  if (!resolved.ok) {
    const isUnusable = resolved.reason === 'unusable'
    return (
      <InviteMessage
        title={isUnusable ? 'Invite expired' : 'Invite not found'}
        body={isUnusable
          ? 'This invite is no longer accepting new members. Ask an admin for a fresh link.'
          : 'This invite link may have been revoked, mistyped, or replaced by a newer invite.'}
      />
    )
  }

  const consumed = await consumeInvite(supabase, resolved.invite, user.id)
  if (!consumed.ok) {
    return (
      <InviteMessage
        title="Could not join group"
        body={consumed.message}
      />
    )
  }

  redirect(`/groups/${consumed.groupId}`)
}
