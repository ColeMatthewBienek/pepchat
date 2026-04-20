'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMessages } from '@/lib/hooks/useMessages'
import { markChannelRead } from '@/lib/channelReadState'
import { usePresence } from '@/lib/hooks/usePresence'
import ChatHeader from '@/components/chat/ChatHeader'
import MessageList from '@/components/chat/MessageList'
import MessageInput from '@/components/chat/MessageInput'
import TypingIndicator from '@/components/chat/TypingIndicator'
import PresencePanel from '@/components/chat/PresencePanel'
import { toggleReaction } from '@/app/(app)/reactions/actions'
import { createClient } from '@/lib/supabase/client'
import type { MessageWithProfile, Profile } from '@/lib/types'
import type { Role } from '@/lib/permissions'

interface ChannelShellProps {
  channelId: string
  channelName: string
  channelTopic?: string | null
  initialMessages: MessageWithProfile[]
  profile: Profile
  userRole?: Role | null
  /** Auth user ID — used for message ownership checks. Defaults to profile.id. */
  userId?: string
}

/**
 * Client wrapper for the chat area.
 * Owns message state, presence state, and reply-to state.
 */
export default function ChannelShell({
  channelId,
  channelName,
  channelTopic,
  initialMessages,
  profile,
  userRole,
  userId,
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
    updateMessageContent,
  } = useMessages(channelId, initialMessages, profile.id)

  const { onlineUsers, typingUsernames, broadcastTyping } = usePresence(channelId, {
    user_id:    profile.id,
    username:   profile.username,
    avatar_url: profile.avatar_url,
  })

  const [replyingTo, setReplyingTo] = useState<MessageWithProfile | null>(null)

  // Mark channel as read on mount (channel navigation)
  useEffect(() => {
    markChannelRead(channelId, profile.id)
  }, [channelId, profile.id])

  // Mark channel as read when a new message arrives while viewing
  const prevLengthRef = useRef(initialMessages.length)
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      prevLengthRef.current = messages.length
      markChannelRead(channelId, profile.id)
    }
  }, [messages.length, channelId, profile.id])

  const handleEdit = useCallback(async (
    messageId: string,
    content: string
  ): Promise<{ error: string } | { ok: true }> => {
    const trimmed = content.trim()
    if (!trimmed) return { error: 'Message cannot be empty.' }
    if (trimmed.length > 4000) return { error: 'Message too long (max 4000 characters).' }
    const supabase = createClient()
    const { error } = await supabase
      .from('messages')
      .update({ content: trimmed, edited_at: new Date().toISOString() })
      .eq('id', messageId)
    if (error) return { error: error.message }
    return { ok: true }
  }, [])

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
      <div
        className="flex flex-col flex-1 min-w-0 min-h-0"
        style={{ background: 'var(--bg-chat)' }}
      >
        <ChatHeader channelName={channelName} channelTopic={channelTopic} />
        <MessageList
          messages={messages}
          hasMore={hasMore}
          loadingMore={loadingMore}
          currentUserId={userId ?? profile.id}
          currentUsername={profile.username}
          onLoadMore={loadMore}
          editAction={handleEdit}
          onReact={handleReact}
          onReply={setReplyingTo}
          userRole={userRole}
          onEditSuccess={updateMessageContent}
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
