'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DMConversation, DirectMessageWithProfile, MessageWithProfile, Profile } from '@/lib/types'

const PAGE_SIZE = 50

const DM_MSG_SELECT = '*, sender:profiles!sender_id(id, username, avatar_url, display_name, username_color, banner_color, badge, pronouns, bio, location, website, member_since, updated_at, created_at)'

const CONV_SELECT = `
  *,
  user_a_profile:profiles!user_a(id, username, avatar_url, display_name, username_color, banner_color, badge, pronouns, bio, location, website, member_since, updated_at, created_at),
  user_b_profile:profiles!user_b(id, username, avatar_url, display_name, username_color, banner_color, badge, pronouns, bio, location, website, member_since, updated_at, created_at)
`

/** Convert a DirectMessageWithProfile to MessageWithProfile shape for MessageList. */
export function mapDMToMessage(dm: DirectMessageWithProfile): MessageWithProfile {
  return {
    id:           dm.id,
    channel_id:   dm.conversation_id,
    user_id:      dm.sender_id,
    content:      dm.content,
    reply_to_id:  null,
    edited_at:    dm.edited_at,
    created_at:   dm.created_at,
    attachments:  dm.attachments,
    profiles: {
      username:     dm.sender.username,
      avatar_url:   dm.sender.avatar_url,
      display_name: dm.sender.display_name,
    },
    reactions:    [],
    replied_to:   null,
  }
}

interface UseDMConversationsReturn {
  conversations: DMConversation[]
  totalUnread: number
  loading: boolean
}

export function useDMConversations(userId: string): UseDMConversationsReturn {
  const [conversations, setConversations] = useState<DMConversation[]>([])
  const [loading, setLoading] = useState(true)
  const nonceRef = useRef(0)

  const fetchAll = useCallback(async () => {
    const supabase = createClient()

    const [{ data: convRows }, { data: unreadRows }] = await Promise.all([
      supabase
        .from('dm_conversations')
        .select(CONV_SELECT)
        .order('last_message_at', { ascending: false, nullsFirst: false }),
      supabase
        .from('direct_messages')
        .select('conversation_id')
        .eq('recipient_id', userId)
        .is('read_at', null),
    ])

    // Count unread per conversation
    const unreadMap: Record<string, number> = {}
    for (const row of unreadRows ?? []) {
      if (row.conversation_id) {
        unreadMap[row.conversation_id] = (unreadMap[row.conversation_id] ?? 0) + 1
      }
    }

    const convs: DMConversation[] = (convRows ?? []).map((c: any) => ({
      id:              c.id,
      user_a:          c.user_a,
      user_b:          c.user_b,
      last_message:    c.last_message,
      last_message_at: c.last_message_at,
      created_at:      c.created_at,
      other_user:      (c.user_a === userId ? c.user_b_profile : c.user_a_profile) as Profile,
      unread_count:    unreadMap[c.id] ?? 0,
    }))

    setConversations(convs)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    fetchAll()

    const supabase = createClient()
    const sub = supabase
      .channel(`dm-conversations-${userId}-${++nonceRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_conversations' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, fetchAll)
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [userId, fetchAll])

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0)

  return { conversations, totalUnread, loading }
}

interface UseDMMessagesReturn {
  messages: MessageWithProfile[]
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => Promise<void>
  addMessage: (dm: DirectMessageWithProfile) => void
}

export function useDMMessages(conversationId: string): UseDMMessagesReturn {
  const [messages, setMessages] = useState<MessageWithProfile[]>([])
  const [hasMore, setHasMore]   = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadingRef = useRef(false)
  const hasMoreRef = useRef(false)
  const msgNonceRef = useRef(0)

  useEffect(() => {
    if (!conversationId) return
    const supabase = createClient()

    async function fetchInitial() {
      const { data } = await supabase
        .from('direct_messages')
        .select(DM_MSG_SELECT)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (data) {
        const mapped = (data as unknown as DirectMessageWithProfile[]).reverse().map(mapDMToMessage)
        setMessages(mapped)
        const more = data.length === PAGE_SIZE
        setHasMore(more)
        hasMoreRef.current = more
      }
    }

    fetchInitial()

    const sub = supabase
      .channel(`dm-messages-${conversationId}-${++msgNonceRef.current}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          // Fetch full message with profile
          const { data: full } = await supabase
            .from('direct_messages')
            .select(DM_MSG_SELECT)
            .eq('id', payload.new.id)
            .single()
          if (full) {
            const mapped = mapDMToMessage(full as unknown as DirectMessageWithProfile)
            setMessages(prev => {
              if (prev.some(m => m.id === mapped.id)) return prev
              return [...prev, mapped]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages(prev => prev.map(m =>
            m.id === payload.new.id
              ? { ...m, content: payload.new.content as string, edited_at: payload.new.edited_at as string | null }
              : m
          ))
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [conversationId])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return
    loadingRef.current = true
    setLoadingMore(true)

    const oldest = messages[0]?.created_at
    if (!oldest) { loadingRef.current = false; setLoadingMore(false); return }

    const supabase = createClient()
    const { data } = await supabase
      .from('direct_messages')
      .select(DM_MSG_SELECT)
      .eq('conversation_id', conversationId)
      .lt('created_at', oldest)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (data) {
      const older = (data as unknown as DirectMessageWithProfile[]).reverse().map(mapDMToMessage)
      setMessages(prev => [...older, ...prev])
      const more = data.length === PAGE_SIZE
      setHasMore(more)
      hasMoreRef.current = more
    }

    loadingRef.current = false
    setLoadingMore(false)
  }, [conversationId, messages])

  const addMessage = useCallback((dm: DirectMessageWithProfile) => {
    const mapped = mapDMToMessage(dm)
    setMessages(prev => {
      if (prev.some(m => m.id === mapped.id)) return prev
      return [...prev, mapped]
    })
  }, [])

  return { messages, hasMore, loadingMore, loadMore, addMessage }
}
