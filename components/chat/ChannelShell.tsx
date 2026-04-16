'use client'

import { useCallback, useState } from 'react'
import { useMessages } from '@/lib/hooks/useMessages'
import { usePresence } from '@/lib/hooks/usePresence'
import MessageList from '@/components/chat/MessageList'
import MessageInput from '@/components/chat/MessageInput'
import TypingIndicator from '@/components/chat/TypingIndicator'
import PresencePanel from '@/components/chat/PresencePanel'
import { toggleReaction } from '@/app/(app)/reactions/actions'
import type { MessageWithProfile, Profile } from '@/lib/types'

interface ChannelShellProps {
  channelId: string
  channelName: string
  initialMessages: MessageWithProfile[]
  profile: Profile
}

/**
 * Client wrapper for the chat area.
 * Owns message state, presence state, and reply-to state.
 */
export default function ChannelShell({
  channelId,
  channelName,
  initialMessages,
  profile,
}: ChannelShellProps) {
  const {
    messages,
    hasMore,
    loadingMore,
    loadMore,
    addMessage,
    broadcastNewMessage,
    toggleReactionOptimistic,
    broadcastReactionChange,
  } = useMessages(channelId, initialMessages, profile.id)

  const { onlineUsers, typingUsernames, broadcastTyping } = usePresence(channelId, {
    user_id:    profile.id,
    username:   profile.username,
    avatar_url: profile.avatar_url,
  })

  const [replyingTo, setReplyingTo] = useState<MessageWithProfile | null>(null)

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    toggleReactionOptimistic(messageId, emoji, profile.id, profile.username)

    const result = await toggleReaction(messageId, emoji)
    if ('error' in result) {
      toggleReactionOptimistic(messageId, emoji, profile.id, profile.username)
      return
    }

    broadcastReactionChange(messageId, emoji, profile.id, result.action)
  }, [broadcastReactionChange, profile.id, profile.username, toggleReactionOptimistic])

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <MessageList
          messages={messages}
          hasMore={hasMore}
          loadingMore={loadingMore}
          currentUserId={profile.id}
          currentUsername={profile.username}
          onLoadMore={loadMore}
          onReact={handleReact}
          onReply={setReplyingTo}
        />
        <TypingIndicator typingUsernames={typingUsernames} />
        <MessageInput
          channelId={channelId}
          channelName={channelName}
          profile={profile}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          onTyping={broadcastTyping}
          onSent={(msg) => {
            addMessage(msg)
            broadcastNewMessage(msg)
            setReplyingTo(null)
          }}
        />
      </div>

      {/* Right panel: online members */}
      <PresencePanel onlineUsers={onlineUsers} />
    </div>
  )
}
