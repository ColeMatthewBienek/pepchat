'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MessageWithProfile } from '@/lib/types'

const PAGE_SIZE = 50

interface UseMessagesReturn {
  messages: MessageWithProfile[]
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => Promise<void>
  addMessage: (msg: MessageWithProfile) => void
  broadcastNewMessage: (msg: MessageWithProfile) => void
}

/**
 * Manages the message list for a channel.
 *
 * New messages use Supabase Broadcast (sender pushes to the room after insert,
 * all other members receive it instantly without RLS interference).
 *
 * Edits and deletes still use postgres_changes since those only need to update
 * existing state and don't require delivering profile data.
 */
export function useMessages(
  channelId: string,
  initialMessages: MessageWithProfile[]
): UseMessagesReturn {
  const [messages, setMessages]       = useState<MessageWithProfile[]>(initialMessages)
  const [hasMore, setHasMore]         = useState(initialMessages.length === PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const room = supabase
      .channel(`messages-${channelId}`)
      // ── Broadcast: new messages sent by other users ──────────────────────
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        const msg = payload.message as MessageWithProfile
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      })
      // ── postgres_changes: edits and deletes ──────────────────────────────
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new.channel_id !== channelId) return
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.new.id
                ? { ...m, content: payload.new.content as string, edited_at: payload.new.edited_at as string | null }
                : m
            )
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
        }
      )
      .subscribe()

    channelRef.current = room

    return () => { supabase.removeChannel(room) }
  }, [channelId])

  /** Broadcast a freshly inserted message to all other room members. */
  const broadcastNewMessage = useCallback((msg: MessageWithProfile) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'new_message',
      payload: { message: msg },
    })
  }, [])

  /** Add a message to local state immediately (used by the sender). */
  const addMessage = useCallback((msg: MessageWithProfile) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev
      return [...prev, msg]
    })
  }, [])

  /** Prepend older messages (pagination). */
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const oldest = messages[0]?.created_at
    if (!oldest) { setLoadingMore(false); return }

    const supabase = createClient()
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(username, avatar_url)')
      .eq('channel_id', channelId)
      .lt('created_at', oldest)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (data) {
      const older = (data as MessageWithProfile[]).reverse()
      setMessages((prev) => [...older, ...prev])
      setHasMore(data.length === PAGE_SIZE)
    }
    setLoadingMore(false)
  }, [channelId, hasMore, loadingMore, messages])

  return { messages, hasMore, loadingMore, loadMore, addMessage, broadcastNewMessage }
}
