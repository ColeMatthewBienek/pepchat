import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChannelShell from '@/components/chat/ChannelShell'
import { MESSAGE_SELECT } from '@/lib/queries'
import type { MessageWithProfile, Profile } from '@/lib/types'

export default async function ChannelPage({
  params,
}: {
  params: { channelId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch channel details
  const { data: channel } = await supabase
    .from('channels')
    .select('*')
    .eq('id', params.channelId)
    .single()

  if (!channel) redirect('/')

  // Fetch current user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Fetch last 50 messages (descending, then reverse for chronological display)
  const { data: messages } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('channel_id', params.channelId)
    .order('created_at', { ascending: false })
    .limit(50)

  const initialMessages = ((messages ?? []).reverse()) as MessageWithProfile[]

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Channel header */}
      <div
        className="flex items-center gap-2 px-4 h-12 border-b border-black/20 flex-shrink-0"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <span className="text-[var(--text-muted)] font-bold text-lg leading-none">#</span>
        <h1 className="font-semibold text-sm">{channel.name}</h1>
        {channel.description && (
          <>
            <span className="text-[var(--text-muted)] text-xs mx-1.5">|</span>
            <p className="text-xs text-[var(--text-muted)] truncate">{channel.description}</p>
          </>
        )}
      </div>

      {/* Chat area with presence */}
      <ChannelShell
        channelId={params.channelId}
        channelName={channel.name}
        initialMessages={initialMessages}
        profile={profile as Profile}
      />
    </div>
  )
}
