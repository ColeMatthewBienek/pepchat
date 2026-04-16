import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from './AppShell'
import type { Profile } from '@/lib/types'

export const runtime = 'edge'

/**
 * Layout for all authenticated app routes.
 * Fetches the session + profile server-side, then renders the 3-panel shell.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, created_at')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/setup-profile')

  return <AppShell profile={profile as Profile}>{children}</AppShell>
}
