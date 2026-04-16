import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Navigating to /groups/[groupId] redirects to the first channel in that group.
 */
export default async function GroupPage({
  params,
}: {
  params: { groupId: string }
}) {
  const supabase = await createClient()

  const { data: channels } = await supabase
    .from('channels')
    .select('id')
    .eq('group_id', params.groupId)
    .order('position', { ascending: true })
    .limit(1)

  if (channels && channels.length > 0) {
    redirect(`/channels/${channels[0].id}`)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
      <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center">
        <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-bold mb-1">No channels yet</h2>
        <p className="text-[var(--text-muted)] text-sm">
          Create a channel in the sidebar to get started.
        </p>
      </div>
    </div>
  )
}
