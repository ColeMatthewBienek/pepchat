import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reportMessage } from '@/app/admin/actions'

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

type ReportInsertError = { message: string; code?: string } | null

function setupReportClient(userId: string | null, insertError: ReportInsertError = null) {
  const insert = vi.fn().mockResolvedValue({ error: insertError })
  const from = vi.fn(() => ({ insert }))
  const getUser = vi.fn().mockResolvedValue({
    data: { user: userId ? { id: userId } : null },
    error: null,
  })

  mockCreateClient.mockResolvedValue({
    auth: { getUser },
    from,
  })

  return { from, getUser, insert }
}

describe('admin actions — reportMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated report submissions', async () => {
    setupReportClient(null)

    await expect(reportMessage('msg-1', 'Spam')).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('inserts a report for the authenticated user', async () => {
    const { from, insert } = setupReportClient('user-1')

    await expect(reportMessage('msg-1', 'Spam')).resolves.toEqual({ ok: true })

    expect(from).toHaveBeenCalledWith('reports')
    expect(insert).toHaveBeenCalledWith({
      message_id: 'msg-1',
      reported_by: 'user-1',
      reason: 'Spam',
    })
  })

  it('treats duplicate reports as already submitted', async () => {
    setupReportClient('user-1', {
      code: '23505',
      message: 'duplicate key value violates unique constraint "idx_reports_unique_message_reporter"',
    })

    await expect(reportMessage('msg-1', 'Spam')).resolves.toEqual({ ok: true })
  })

  it('surfaces non-duplicate insert errors', async () => {
    setupReportClient('user-1', { message: 'permission denied' })

    await expect(reportMessage('msg-1', 'Spam')).resolves.toEqual({ error: 'permission denied' })
  })
})
