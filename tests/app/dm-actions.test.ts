import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteDM, editDM, sendDM } from '@/app/(app)/dm/actions'

const { mockCreateClient, mockEnqueueDirectMessageNotification } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockEnqueueDirectMessageNotification: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('@/lib/server-notifications', () => ({
  enqueueDirectMessageNotification: mockEnqueueDirectMessageNotification,
}))

type QueryResult = { data?: unknown; error?: { message: string } | null }

function makeBuilder(result: QueryResult = {}) {
  const builder: Record<string, unknown> = {
    _updates: [] as unknown[],
  }

  for (const method of ['insert', 'select', 'eq', 'order', 'limit']) {
    builder[method] = vi.fn(() => builder)
  }

  builder.update = vi.fn((payload: unknown) => {
    ;(builder._updates as unknown[]).push(payload)
    return builder
  })
  builder.delete = vi.fn(() => builder)
  builder.single = vi.fn().mockResolvedValue({
    data: result.data ?? null,
    error: result.error ?? null,
  })
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(resolve, reject)

  return builder
}

function setupClient(builders: Record<string, unknown>[]) {
  let index = 0
  const from = vi.fn(() => {
    const builder = builders[index]
    index += 1
    return builder
  })

  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null }),
    },
    from,
  })

  return { from }
}

describe('DM actions — conversation preview maintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnqueueDirectMessageNotification.mockResolvedValue(undefined)
  })

  it('updates the conversation preview after editing the latest DM', async () => {
    const editBuilder = makeBuilder({
      data: {
        id: 'dm-1',
        conversation_id: 'conv-1',
        content: 'Updated message',
        attachments: [],
        created_at: '2024-03-01T10:00:00Z',
      },
    })
    const latestBuilder = makeBuilder({
      data: {
        id: 'dm-1',
        conversation_id: 'conv-1',
        content: 'Updated message',
        attachments: [],
        created_at: '2024-03-01T10:00:00Z',
      },
    })
    const conversationBuilder = makeBuilder()

    setupClient([editBuilder, latestBuilder, conversationBuilder])

    await expect(editDM('dm-1', ' Updated message ')).resolves.toEqual({ ok: true })

    expect(conversationBuilder.update).toHaveBeenCalledWith({
      last_message: 'Updated message',
      last_message_at: '2024-03-01T10:00:00Z',
    })
    expect(conversationBuilder.eq).toHaveBeenCalledWith('id', 'conv-1')
  })

  it('uses an image label for image-only DM previews', async () => {
    const messageBuilder = makeBuilder({
      data: {
        id: 'dm-1',
        conversation_id: 'conv-1',
        sender_id: 'user-a',
        recipient_id: 'user-b',
        content: '',
        attachments: [{ type: 'image', url: 'https://example.com/image.jpg', name: 'image.jpg', size: 123 }],
        edited_at: null,
        read_at: null,
        created_at: '2024-03-01T10:00:00Z',
        sender: { id: 'user-a', username: 'alice' },
      },
    })
    const conversationBuilder = makeBuilder()

    setupClient([messageBuilder, conversationBuilder])

    await sendDM('conv-1', 'user-b', '   ', [
      { type: 'image', url: 'https://example.com/image.jpg', name: 'image.jpg', size: 123 },
    ])

    expect(conversationBuilder.update).toHaveBeenCalledWith({
      last_message: 'Image',
      last_message_at: expect.any(String),
    })
    expect(mockEnqueueDirectMessageNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        recipientId: 'user-b',
        senderId: 'user-a',
        senderName: 'alice',
        messageId: 'dm-1',
        conversationId: 'conv-1',
      })
    )
  })

  it('uses a GIF label for GIF-only DM previews', async () => {
    const messageBuilder = makeBuilder({
      data: {
        id: 'dm-1',
        conversation_id: 'conv-1',
        sender_id: 'user-a',
        recipient_id: 'user-b',
        content: '',
        attachments: [{ type: 'gif', url: 'https://example.com/gif.gif', name: 'gif', preview: 'https://example.com/gif.gif', width: 200, height: 200, source: 'klipy' }],
        edited_at: null,
        read_at: null,
        created_at: '2024-03-01T10:00:00Z',
        sender: { id: 'user-a', username: 'alice' },
      },
    })
    const conversationBuilder = makeBuilder()

    setupClient([messageBuilder, conversationBuilder])

    await sendDM('conv-1', 'user-b', '', [
      { type: 'gif', url: 'https://example.com/gif.gif', name: 'gif', preview: 'https://example.com/gif.gif', width: 200, height: 200, source: 'klipy' },
    ])

    expect(conversationBuilder.update).toHaveBeenCalledWith({
      last_message: 'GIF',
      last_message_at: expect.any(String),
    })
  })

  it('uses an attachment count for multi-attachment DM previews', async () => {
    const attachments = [
      { type: 'image' as const, url: 'https://example.com/1.jpg', name: '1.jpg', size: 123 },
      { type: 'image' as const, url: 'https://example.com/2.jpg', name: '2.jpg', size: 456 },
    ]
    const messageBuilder = makeBuilder({
      data: {
        id: 'dm-1',
        conversation_id: 'conv-1',
        sender_id: 'user-a',
        recipient_id: 'user-b',
        content: '',
        attachments,
        edited_at: null,
        read_at: null,
        created_at: '2024-03-01T10:00:00Z',
        sender: { id: 'user-a', username: 'alice' },
      },
    })
    const conversationBuilder = makeBuilder()

    setupClient([messageBuilder, conversationBuilder])

    await sendDM('conv-1', 'user-b', '', attachments)

    expect(conversationBuilder.update).toHaveBeenCalledWith({
      last_message: '2 attachments',
      last_message_at: expect.any(String),
    })
  })

  it('still sends the DM when notification enqueue fails', async () => {
    const message = {
      id: 'dm-1',
      conversation_id: 'conv-1',
      sender_id: 'user-a',
      recipient_id: 'user-b',
      content: 'Hello',
      attachments: [],
      edited_at: null,
      read_at: null,
      created_at: '2024-03-01T10:00:00Z',
      sender: { id: 'user-a', username: 'alice' },
    }
    const messageBuilder = makeBuilder({
      data: message,
    })
    const conversationBuilder = makeBuilder()
    mockEnqueueDirectMessageNotification.mockRejectedValue(new Error('notification failed'))

    setupClient([messageBuilder, conversationBuilder])

    await expect(sendDM('conv-1', 'user-b', 'Hello')).resolves.toEqual({
      ok: true,
      message,
    })
  })

  it('falls back to the previous DM after deleting the latest DM', async () => {
    const targetBuilder = makeBuilder({ data: { id: 'dm-2', conversation_id: 'conv-1' } })
    const deleteBuilder = makeBuilder()
    const latestBuilder = makeBuilder({
      data: {
        id: 'dm-1',
        conversation_id: 'conv-1',
        content: '',
        attachments: [{ type: 'gif', url: 'https://example.com/gif.gif', name: 'gif', preview: 'https://example.com/gif.gif', width: 200, height: 200, source: 'klipy' }],
        created_at: '2024-03-01T09:00:00Z',
      },
    })
    const conversationBuilder = makeBuilder()

    setupClient([targetBuilder, deleteBuilder, latestBuilder, conversationBuilder])

    await expect(deleteDM('dm-2')).resolves.toEqual({ ok: true })

    expect(conversationBuilder.update).toHaveBeenCalledWith({
      last_message: 'GIF',
      last_message_at: '2024-03-01T09:00:00Z',
    })
    expect(conversationBuilder.eq).toHaveBeenCalledWith('id', 'conv-1')
  })

  it('clears the conversation preview after deleting the only DM', async () => {
    const targetBuilder = makeBuilder({ data: { id: 'dm-1', conversation_id: 'conv-1' } })
    const deleteBuilder = makeBuilder()
    const latestBuilder = makeBuilder({ data: null })
    const conversationBuilder = makeBuilder()

    setupClient([targetBuilder, deleteBuilder, latestBuilder, conversationBuilder])

    await expect(deleteDM('dm-1')).resolves.toEqual({ ok: true })

    expect(conversationBuilder.update).toHaveBeenCalledWith({
      last_message: null,
      last_message_at: null,
    })
  })
})
