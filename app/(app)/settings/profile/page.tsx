import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { Profile } from '@/lib/types'
import { PERMISSIONS, type Role } from '@/lib/permissions'
import { getProfile } from '@/app/(app)/profile/actions'

const EditProfilePage = dynamic(() => import('@/components/profile/EditProfilePage'), { ssr: false })

export default async function SettingsProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('group_members')
    .select('role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const role: Role = (member?.role as Role) ?? 'user'
  const profile = await getProfile(user.id)
  if (!profile) redirect('/login')

  return <EditProfilePage profile={profile} userRole={role} />
}
