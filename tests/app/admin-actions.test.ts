import { beforeEach, describe, expect, it, vi } from 'vitest'
import { changeRole, deleteReportedMessage, dismissReport, markReportReviewed, reportMessage } from '@/app/admin/actions'

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

function setupAdminClient() {
  const single = vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
  const limit = vi.fn(() => ({ single }))
  const eq = vi.fn(() => ({ eq, limit }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: 'admin-1' } },
    error: null,
  })

  mockCreateClient.mockResolvedValue({
    auth: { getUser },
    from,
  })

  return { from }
}

function setupReportModerationClient(reportStatus: 'pending' | 'reviewed' | 'dismissed') {
  const groupSingle = vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
  const groupLimit = vi.fn(() => ({ single: groupSingle }))
  const groupEq = vi.fn(() => ({ eq: groupEq, limit: groupLimit }))
  const groupSelect = vi.fn(() => ({ eq: groupEq }))

  const reportSingle = vi.fn().mockResolvedValue({
    data: {
      id: 'report-1',
      message_id: 'msg-1',
      reason: 'spam',
      status: reportStatus,
      reported_by: 'user-1',
      messages: { content: 'reported content', channel_id: 'ch-1', user_id: 'author-1' },
      profiles: { username: 'reporter' },
    },
    error: null,
  })
  const reportSelectEq = vi.fn(() => ({ single: reportSingle }))
  const reportSelect = vi.fn(() => ({ eq: reportSelectEq }))
  const reportUpdateEq = vi.fn().mockResolvedValue({ error: null })
  const reportUpdate = vi.fn(() => ({ eq: reportUpdateEq }))

  const messageDeleteEq = vi.fn().mockResolvedValue({ error: null })
  const messageDelete = vi.fn(() => ({ eq: messageDeleteEq }))

  const auditInsert = vi.fn().mockResolvedValue({ error: null })

  const from = vi.fn((table: string) => {
    if (table === 'group_members') return { select: groupSelect }
    if (table === 'reports') return { select: reportSelect, update: reportUpdate }
    if (table === 'messages') return { delete: messageDelete }
    if (table === 'audit_log') return { insert: auditInsert }
    throw new Error(`Unexpected table: ${table}`)
  })
  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: 'admin-1' } },
    error: null,
  })

  mockCreateClient.mockResolvedValue({
    auth: { getUser },
    from,
  })

  return { from, reportUpdate, messageDelete, auditInsert }
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

describe('admin actions — changeRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects direct admin role assignment', async () => {
    const { from } = setupAdminClient()

    await expect(changeRole('user-1', 'group-1', 'admin', 'target', 'user')).resolves.toEqual({
      error: 'Admin role assignment is disabled.',
    })

    expect(from).toHaveBeenCalledWith('group_members')
    expect(from).not.toHaveBeenCalledWith('audit_log')
  })
})

describe('admin actions — report moderation guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not mark a closed report reviewed', async () => {
    const { reportUpdate, auditInsert } = setupReportModerationClient('dismissed')

    await expect(markReportReviewed('report-1')).resolves.toEqual({
      error: 'Only pending reports can be modified.',
    })

    expect(reportUpdate).not.toHaveBeenCalled()
    expect(auditInsert).not.toHaveBeenCalled()
  })

  it('does not dismiss a closed report', async () => {
    const { reportUpdate, auditInsert } = setupReportModerationClient('reviewed')

    await expect(dismissReport('report-1')).resolves.toEqual({
      error: 'Only pending reports can be modified.',
    })

    expect(reportUpdate).not.toHaveBeenCalled()
    expect(auditInsert).not.toHaveBeenCalled()
  })

  it('does not delete a message for a closed report', async () => {
    const { messageDelete, auditInsert } = setupReportModerationClient('reviewed')

    await expect(deleteReportedMessage('report-1')).resolves.toEqual({
      error: 'Only pending reports can be modified.',
    })

    expect(messageDelete).not.toHaveBeenCalled()
    expect(auditInsert).not.toHaveBeenCalled()
  })
})
