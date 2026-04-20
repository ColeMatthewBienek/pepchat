import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNav from '@/components/admin/AdminNav'
import { headers } from 'next/headers'

export const runtime = 'edge'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, group_members(role)')
    .eq('id', user.id)
    .single()

  const isAdmin = (profile as any)?.group_members?.some(
    (gm: { role: string }) => gm.role === 'admin'
  )

  if (!isAdmin) redirect('/')

  // Determine active tab from the pathname
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const activeTab = pathname.split('/').pop() ?? 'overview'

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <AdminNav activeTab={activeTab} />
      <main style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        {children}
      </main>
    </div>
  )
}
