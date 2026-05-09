import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  enqueueDirectMessageNotification,
  notificationBody,
} from '@/lib/server-notifications'

type QueryResult = { data?: unknown; error?: { message: string } | null }

function makeBuilder(result: QueryResult = {}) {
  const builder: Record<string, unknown> = {}
  const resolved = Promise.resolve({
    data: result.data ?? null,
    error: result.error ?? null,
  })

  for (const method of ['select', 'eq', 'maybeSingle']) {
    builder[method] = vi.fn(() => builder)
  }
  builder.insert = vi.fn(() => builder)
  builder.then = resolved.then.bind(resolved)
  builder.maybeSingle = vi.fn().mockResolvedValue({
    data: result.data ?? null,
    error: result.error ?? null,
  })

  return builder
}

function setupClient(builders: Record<string, unknown>[]) {
  let index = 0
  const from = vi.fn(() => {
    const builder = builders[index]
    index += 1
    return builder
  })

  return { from }
}

const INPUT = {
  recipientId: 'user-b',
  senderId: 'user-a',
  senderName: 'Alice',
  messageId: 'dm-1',
  conversationId: 'conv-1',
  content: 'Hello there',
  attachments: [],
}

describe('server notification helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('formats notification bodies from text and attachments', () => {
    expect(notificationBody('  Hello there  ')).toBe('Hello there')
    expect(notificationBody('', [{ type: 'image', url: 'https://example.com/a.jpg', name: 'a.jpg', size: 1 }])).toBe('Image')
    expect(notificationBody('', [
      { type: 'image', url: 'https://example.com/a.jpg', name: 'a.jpg', size: 1 },
      { type: 'image', url: 'https://example.com/b.jpg', name: 'b.jpg', size: 1 },
    ])).toBe('2 attachments')
  })

  it('enqueues a direct message notification when enabled', async () => {
    const preferenceBuilder = makeBuilder({ data: { dm_messages: true } })
    const eventBuilder = makeBuilder()
    const supabase = setupClient([preferenceBuilder, eventBuilder])

    await enqueueDirectMessageNotification(supabase as any, INPUT)

    expect(supabase.from).toHaveBeenCalledWith('notification_preferences')
    expect(preferenceBuilder.eq).toHaveBeenCalledWith('user_id', 'user-b')
    expect(supabase.from).toHaveBeenCalledWith('notification_events')
    expect(eventBuilder.insert).toHaveBeenCalledWith(
      {
        user_id: 'user-b',
        actor_id: 'user-a',
        type: 'dm_message',
        source_table: 'direct_messages',
        source_id: 'dm-1',
        conversation_id: 'conv-1',
        channel_id: null,
        title: 'Alice',
        body: 'Hello there',
        url: '/channels?dm=conv-1',
      }
    )
  })

  it('defaults to enabled when preferences do not exist', async () => {
    const preferenceBuilder = makeBuilder({ data: null })
    const eventBuilder = makeBuilder()
    const supabase = setupClient([preferenceBuilder, eventBuilder])

    await enqueueDirectMessageNotification(supabase as any, INPUT)

    expect(eventBuilder.insert).toHaveBeenCalled()
  })

  it('does not enqueue when direct message notifications are disabled', async () => {
    const preferenceBuilder = makeBuilder({ data: { dm_messages: false } })
    const eventBuilder = makeBuilder()
    const supabase = setupClient([preferenceBuilder, eventBuilder])

    await enqueueDirectMessageNotification(supabase as any, INPUT)

    expect(eventBuilder.insert).not.toHaveBeenCalled()
  })

  it('does not enqueue self-notifications', async () => {
    const preferenceBuilder = makeBuilder({ data: { dm_messages: true } })
    const eventBuilder = makeBuilder()
    const supabase = setupClient([preferenceBuilder, eventBuilder])

    await enqueueDirectMessageNotification(supabase as any, {
      ...INPUT,
      recipientId: 'user-a',
    })

    expect(supabase.from).not.toHaveBeenCalled()
    expect(eventBuilder.insert).not.toHaveBeenCalled()
  })
})
