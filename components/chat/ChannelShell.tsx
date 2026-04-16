'use client'

import { useMessages } from '@/lib/hooks/useMessages'
import { usePresence } from '@/lib/hooks/usePresence'
import MessageList from '@/components/chat/MessageList'
import MessageInput from '@/components/chat/MessageInput'
import TypingIndicator from '@/components/chat/TypingIndicator'
import PresencePanel from '@/components/chat/PresencePanel'
import type { MessageWithProfile, Profile } from '@/lib/types'

interface ChannelShellProps {
  channelId: string
  channelName: string
  initialMessages: MessageWithProfile[]
  profile: Profile
}

/**
 * Client wrapper for the chat area.
 * Owns message state (via useMessages) and presence state (via usePresence).
 */
export default function ChannelShell({
  channelId,
  channelName,
  initialMessages,
  profile,
}: ChannelShellProps) {
  const { messages, hasMore, loadingMore, loadMore, addMessage, broadcastNewMessage } = useMessages(
    channelId,
    initialMessages
  )

  const { onlineUsers, typingUsernames, broadcastTyping } = usePresence(channelId, {
    user_id:    profile.id,
    username:   profile.username,
    avatar_url: profile.avatar_url,
  })

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <MessageList
          messages={messages}
          hasMore={hasMore}
          loadingMore={loadingMore}
          currentUserId={profile.id}
          onLoadMore={loadMore}
        />
        <TypingIndicator typingUsernames={typingUsernames} />
        <MessageInput
          channelId={channelId}
          channelName={channelName}
          profile={profile}
          onTyping={broadcastTyping}
          onSent={(msg) => {
            addMessage(msg)           // show immediately for the sender
            broadcastNewMessage(msg)  // push to everyone else in the room
          }}
        />
      </div>

      {/* Right panel: online members */}
      <PresencePanel onlineUsers={onlineUsers} />
    </div>
  )
}
